package com.sawerduite.paymentlistener

import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import android.os.SystemClock
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.UUID

class NotificationListener : NotificationListenerService() {

    companion object {
        private const val TAG = "NotificationListener"

        // Target package names
        private val TARGET_PACKAGES = setOf(
            "id.dana",
            "id.dana.business",
            "com.gojek.gopaymerchant"
        )

        // Cache untuk mencegah duplicate (TTL 10 detik)
        private const val CACHE_TTL_MS = 10_000L
    }

    // Cache hash notifikasi untuk mencegah duplicate
    private val notificationCache = ConcurrentHashMap<String, Long>()

    // Executor untuk background tasks
    private val executor = Executors.newSingleThreadExecutor()

    // Scheduler untuk membersihkan cache
    private val cacheCleanupScheduler = Executors.newSingleThreadScheduledExecutor()

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "NotificationListener service created")

        // Schedule cache cleanup setiap 30 detik
        cacheCleanupScheduler.scheduleAtFixedRate({
            cleanupCache()
        }, 30, 30, TimeUnit.SECONDS)
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.d(TAG, "NotificationListener service destroyed")
        executor.shutdown()
        cacheCleanupScheduler.shutdown()
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        Log.d(TAG, "NotificationListener connected")
        ClientLogger.log(
            this,
            level = "info",
            event = "LISTENER_CONNECTED",
            message = "Notification listener connected"
        )
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        Log.d(TAG, "NotificationListener disconnected")
        ClientLogger.log(
            this,
            level = "warn",
            event = "LISTENER_DISCONNECTED",
            message = "Notification listener disconnected"
        )
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        sbn ?: return

        val packageName = sbn.packageName

        // Filter hanya notifikasi dari DANA
        if (!TARGET_PACKAGES.contains(packageName)) {
            return
        }

        Log.d(TAG, "========== DANA Notification Received ==========")
        Log.d(TAG, "Package: $packageName")

        try {
            SettingsManager(this).lastNotificationTs = System.currentTimeMillis()

            val notification = sbn.notification
            val extras = notification.extras

            // Ambil title dan text dari extras (termasuk bigText/textLines)
            val extracted = NotificationTextExtractor.extract(extras)
            val title = extracted.title
            val text = extracted.text

            Log.d(TAG, "Title: $title")
            Log.d(TAG, "Text: $text")

            ClientLogger.log(
                this,
                level = "info",
                event = "NOTIF_RECEIVED",
                message = "Notification received",
                data = mapOf(
                    "package" to packageName,
                    "id" to sbn.id,
                    "postTime" to sbn.postTime,
                    "title" to title,
                    "text" to text,
                    "rawLines" to extracted.rawLines,
                    "network" to ClientLogger.NetworkInfo.collect(this)
                )
            )

            if (text.isBlank()) {
                ClientLogger.log(
                    this,
                    level = "warn",
                    event = "NOTIF_EMPTY_TEXT",
                    message = "Notification text is empty",
                    data = mapOf(
                        "package" to packageName,
                        "title" to title
                    )
                )
            }

            // Cek apakah ini notifikasi pembayaran masuk
            if (!isPaymentNotification(title, text)) {
                Log.d(TAG, "Bukan notifikasi pembayaran masuk, skip...")
                ClientLogger.log(
                    this,
                    level = "info",
                    event = "NOTIF_SKIPPED",
                    message = "Not a payment notification",
                    data = mapOf(
                        "package" to packageName,
                        "title" to title,
                        "text" to text
                    )
                )
                return
            }

            // Generate hash untuk cek duplicate
            val notificationHash = generateHash(packageName, title, text, sbn.postTime)

            // Cek duplicate
            if (isDuplicate(notificationHash)) {
                Log.d(TAG, "Duplicate notification detected, skip...")
                ClientLogger.log(
                    this,
                    level = "info",
                    event = "NOTIF_SKIPPED",
                    message = "Duplicate notification",
                    data = mapOf(
                        "package" to packageName,
                        "title" to title,
                        "text" to text
                    )
                )
                return
            }

            // Tambahkan ke cache
            notificationCache[notificationHash] = System.currentTimeMillis()

            // Parse data pembayaran (Pass packageName to detect provider)
            val parsedData = Parser.parsePaymentText(text, packageName)

            Log.d(TAG, "Parsed Provider: ${parsedData.provider}")
            Log.d(TAG, "Parsed Amount: ${parsedData.amount}")
            Log.d(TAG, "Parsed Bank: ${parsedData.bank}")

            ClientLogger.log(
                this,
                level = "info",
                event = "NOTIF_PARSED",
                message = "Parsed payment data",
                data = mapOf(
                    "provider" to parsedData.provider,
                    "amount" to parsedData.amount,
                    "bank" to parsedData.bank
                )
            )

            // Buat payload
            val paymentData = PaymentData(
                title = title,
                message = text,
                amount = parsedData.amount,
                bank = parsedData.bank,
                source = parsedData.provider
            )

            Log.d(TAG, "Payload: $paymentData")

            // Kirim ke backend di background thread
            executor.submit {
                sendToBackendWithRetry(paymentData)
            }

        } catch (e: Exception) {
            Log.e(TAG, "Error processing notification", e)
            ClientLogger.log(
                this,
                level = "error",
                event = "NOTIF_ERROR",
                message = "Error processing notification",
                error = e
            )
        }
    }

    override fun onNotificationRemoved(sbn: StatusBarNotification?) {
        // Optional: handle notification removal
        sbn?.let {
            if (TARGET_PACKAGES.contains(it.packageName)) {
                Log.d(TAG, "DANA notification removed: ${it.id}")
            }
        }
    }

    private fun isPaymentNotification(title: String, text: String): Boolean {
        // Cek apakah title atau text mengindikasikan pembayaran masuk
        val paymentKeywords = listOf(
            "pembayaran masuk",
            "payment received",
            "berhasil diterima",
            "telah diterima",
            "dana masuk",
            "transfer masuk",
            "pembayaran qris"
        )

        val lowerTitle = title.lowercase()
        val lowerText = text.lowercase()

        return paymentKeywords.any { keyword ->
            lowerTitle.contains(keyword) || lowerText.contains(keyword)
        }
    }

    private fun generateHash(packageName: String, title: String, text: String, postTime: Long): String {
        val payload = "$packageName|$title|$text|$postTime"
        return payload.hashCode().toString()
    }

    private fun isDuplicate(hash: String): Boolean {
        val cachedTime = notificationCache[hash] ?: return false
        val currentTime = System.currentTimeMillis()
        return (currentTime - cachedTime) < CACHE_TTL_MS
    }

    private fun cleanupCache() {
        val currentTime = System.currentTimeMillis()
        val expiredKeys = notificationCache.filter { (_, timestamp) ->
            (currentTime - timestamp) > CACHE_TTL_MS
        }.keys

        expiredKeys.forEach { key ->
            notificationCache.remove(key)
        }

        if (expiredKeys.isNotEmpty()) {
            Log.d(TAG, "Cleaned up ${expiredKeys.size} expired cache entries")
        }
    }

    private fun sendToBackendWithRetry(paymentData: PaymentData, maxRetries: Int = 3) {
        var retryCount = 0
        var success = false

        while (!success && retryCount < maxRetries) {
            try {
                Log.d(TAG, "Sending to backend (attempt ${retryCount + 1}/$maxRetries)")
                val attemptId = UUID.randomUUID().toString()
                val start = SystemClock.elapsedRealtime()
                val appTokenPresent = SettingsManager(this).appToken.isNotBlank()
                success = NetworkClient.sendPaymentData(this, paymentData)
                val durationMs = SystemClock.elapsedRealtime() - start

                ClientLogger.log(
                    this,
                    level = if (success) "info" else "warn",
                    event = if (success) "SEND_SUCCESS" else "SEND_FAIL",
                    message = "Send attempt finished",
                    data = mapOf(
                        "attemptId" to attemptId,
                        "attempt" to (retryCount + 1),
                        "durationMs" to durationMs,
                        "amount" to paymentData.amount,
                        "bank" to paymentData.bank,
                        "source" to paymentData.source,
                        "appTokenPresent" to appTokenPresent,
                        "network" to ClientLogger.NetworkInfo.collect(this)
                    )
                )

                if (success) {
                    Log.d(TAG, "✅ Successfully sent to backend")
                } else {
                    retryCount++
                    if (retryCount < maxRetries) {
                        Log.w(TAG, "Backend returned error, retrying in 2 seconds...")
                        Thread.sleep(2000)
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error sending to backend", e)
                ClientLogger.log(
                    this,
                    level = "error",
                    event = "SEND_ERROR",
                    message = "Exception during send",
                    error = e,
                    data = mapOf(
                        "attempt" to (retryCount + 1),
                        "amount" to paymentData.amount,
                        "bank" to paymentData.bank,
                        "source" to paymentData.source,
                        "appTokenPresent" to SettingsManager(this).appToken.isNotBlank(),
                        "network" to ClientLogger.NetworkInfo.collect(this)
                    )
                )
                retryCount++
                if (retryCount < maxRetries) {
                    Thread.sleep(2000)
                }
            }
        }

        if (!success) {
            Log.e(TAG, "❌ Failed to send to backend after $maxRetries attempts")
            ClientLogger.log(
                this,
                level = "error",
                event = "SEND_GAVE_UP",
                message = "Failed to send after retries",
                data = mapOf(
                    "maxRetries" to maxRetries,
                    "amount" to paymentData.amount,
                    "bank" to paymentData.bank,
                    "source" to paymentData.source,
                    "appTokenPresent" to SettingsManager(this).appToken.isNotBlank(),
                    "network" to ClientLogger.NetworkInfo.collect(this)
                )
            )
        }
    }
}
