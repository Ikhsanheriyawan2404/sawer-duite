package com.ongob.paymentlistener

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object WatchdogScheduler {
    private const val WORK_NAME = "listener_watchdog"

    fun ensureScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<ListenerWatchdogWorker>(
            6, TimeUnit.HOURS,
            1, TimeUnit.HOURS
        ).build()

        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.KEEP, request)
    }
}
