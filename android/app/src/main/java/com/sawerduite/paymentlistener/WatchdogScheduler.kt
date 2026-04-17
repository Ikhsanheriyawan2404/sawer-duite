package com.sawerduite.paymentlistener

import android.content.Context
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object WatchdogScheduler {
    private const val WORK_NAME = "listener_watchdog"

    fun ensureScheduled(context: Context) {
        val request = PeriodicWorkRequestBuilder<ListenerWatchdogWorker>(
            1, TimeUnit.HOURS,
            15, TimeUnit.MINUTES
        ).build()

        WorkManager.getInstance(context)
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, request)
    }
}
