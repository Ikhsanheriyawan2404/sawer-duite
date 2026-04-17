package com.sawerduite.paymentlistener

import android.content.ComponentName
import android.content.Context
import android.provider.Settings
import android.text.TextUtils
import androidx.work.ListenableWorker
import androidx.work.Worker
import androidx.work.WorkerParameters
import java.util.concurrent.TimeUnit

class ListenerWatchdogWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {

    override fun doWork(): ListenableWorker.Result {
        val settings = SettingsManager(applicationContext)
        val lastTs = settings.lastNotificationTs
        val now = System.currentTimeMillis()
        val sinceMs = if (lastTs > 0) now - lastTs else -1L

        val enabled = isNotificationListenerEnabled(applicationContext)
        var rebindTriggered = false

        // Jika listener aktif tapi lama tidak ada notifikasi, coba rebind
        if (enabled) {
            val thresholdMs = TimeUnit.HOURS.toMillis(1)
            if (sinceMs < 0 || sinceMs >= thresholdMs) {
                NotificationListenerServiceCompat.requestRebind(applicationContext)
                rebindTriggered = true
            }
        }

        ClientLogger.log(
            applicationContext,
            level = "info",
            event = "LISTENER_HEARTBEAT",
            message = "Listener watchdog heartbeat",
            data = mapOf(
                "enabled" to enabled,
                "lastNotificationTs" to lastTs,
                "sinceLastMs" to sinceMs,
                "rebindTriggered" to rebindTriggered
            )
        )

        return ListenableWorker.Result.success()
    }

    private fun isNotificationListenerEnabled(context: Context): Boolean {
        val packageName = context.packageName
        val flat = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
        if (!TextUtils.isEmpty(flat)) {
            val names = flat.split(":").toTypedArray()
            for (name in names) {
                val cn = ComponentName.unflattenFromString(name)
                if (cn != null && TextUtils.equals(packageName, cn.packageName)) {
                    return true
                }
            }
        }
        return false
    }
}

object NotificationListenerServiceCompat {
    fun requestRebind(context: Context) {
        val component = ComponentName(context, NotificationListener::class.java)
        android.service.notification.NotificationListenerService.requestRebind(component)
    }
}
