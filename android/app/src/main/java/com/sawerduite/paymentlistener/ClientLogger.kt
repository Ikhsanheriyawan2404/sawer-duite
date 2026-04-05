package com.sawerduite.paymentlistener

import android.content.Context
import android.os.Build
import android.util.Log
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONObject
import java.io.File
import java.util.UUID
import android.net.ConnectivityManager
import android.net.NetworkCapabilities

object ClientLogger {

    private const val TAG = "ClientLogger"
    private const val LOG_FILE = "client_logs.jsonl"
    private const val MAX_FILE_BYTES = 512 * 1024 // 512 KB
    private const val MAX_KEEP_LINES = 500

    private val lock = Any()

    fun log(
        context: Context,
        level: String,
        event: String,
        message: String = "",
        data: Map<String, Any?> = emptyMap(),
        error: Throwable? = null
    ) {
        val logJson = JSONObject()
        logJson.put("id", UUID.randomUUID().toString())
        logJson.put("ts", System.currentTimeMillis())
        logJson.put("level", level)
        logJson.put("event", event)
        logJson.put("message", message)
        logJson.put("data", JSONObject(data.filterValues { it != null }))
        logJson.put("device", JSONObject(DeviceInfo.collect(context)))
        if (error != null) {
            logJson.put("error", error.stackTraceToString().take(4000))
        }

        when (level.lowercase()) {
            "error" -> Log.e(TAG, "[$event] $message", error)
            "warn" -> Log.w(TAG, "[$event] $message")
            else -> Log.d(TAG, "[$event] $message")
        }

        appendToFile(context, logJson.toString())
        enqueueUpload(context)
    }

    fun readBatch(context: Context, maxLines: Int): List<String> {
        synchronized(lock) {
            val file = File(context.filesDir, LOG_FILE)
            if (!file.exists()) return emptyList()
            val lines = file.readLines()
            if (lines.isEmpty()) return emptyList()
            return lines.take(maxLines)
        }
    }

    fun removeBatch(context: Context, count: Int) {
        synchronized(lock) {
            val file = File(context.filesDir, LOG_FILE)
            if (!file.exists()) return
            val lines = file.readLines()
            if (lines.isEmpty()) return

            val remaining = if (lines.size > count) {
                lines.drop(count)
            } else {
                emptyList()
            }

            file.writeText(if (remaining.isNotEmpty()) remaining.joinToString("\n", postfix = "\n") else "")
        }
    }

    fun hasMore(context: Context): Boolean {
        synchronized(lock) {
            val file = File(context.filesDir, LOG_FILE)
            if (!file.exists()) return false
            val lines = file.readLines()
            return lines.isNotEmpty()
        }
    }

    private fun appendToFile(context: Context, line: String) {
        synchronized(lock) {
            val file = File(context.filesDir, LOG_FILE)
            if (!file.exists()) {
                file.createNewFile()
            }

            file.appendText(line + "\n")
            trimIfNeeded(file)
        }
    }

    private fun trimIfNeeded(file: File) {
        if (file.length() <= MAX_FILE_BYTES) return

        val lines = file.readLines()
        val keep = if (lines.size > MAX_KEEP_LINES) {
            lines.takeLast(MAX_KEEP_LINES)
        } else {
            lines
        }
        file.writeText(if (keep.isNotEmpty()) keep.joinToString("\n", postfix = "\n") else "")
    }

    private fun enqueueUpload(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val work = OneTimeWorkRequestBuilder<LogUploadWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context)
            .enqueueUniqueWork("upload_client_logs", ExistingWorkPolicy.KEEP, work)
    }

    object DeviceInfo {
        fun collect(context: Context): Map<String, Any?> {
            val pm = context.packageManager
            val pkg = context.packageName
            val versionName = try {
                val pi = pm.getPackageInfo(pkg, 0)
                pi.versionName
            } catch (_: Exception) {
                null
            }

            return mapOf(
                "package" to pkg,
                "version" to versionName,
                "sdk" to Build.VERSION.SDK_INT,
                "model" to Build.MODEL,
                "brand" to Build.BRAND,
                "device" to Build.DEVICE,
                "manufacturer" to Build.MANUFACTURER
            )
        }
    }

    object NetworkInfo {
        fun collect(context: Context): Map<String, Any?> {
            val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
            val active = cm.activeNetwork
            val caps = cm.getNetworkCapabilities(active)

            val transport = when {
                caps == null -> "none"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "wifi"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "cellular"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> "ethernet"
                caps.hasTransport(NetworkCapabilities.TRANSPORT_BLUETOOTH) -> "bluetooth"
                else -> "other"
            }

            return mapOf(
                "transport" to transport,
                "metered" to cm.isActiveNetworkMetered
            )
        }
    }
}
