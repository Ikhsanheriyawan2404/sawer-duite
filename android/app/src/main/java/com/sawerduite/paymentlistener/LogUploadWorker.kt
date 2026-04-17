package com.sawerduite.paymentlistener

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters
import androidx.work.ListenableWorker
import org.json.JSONArray

class LogUploadWorker(appContext: Context, params: WorkerParameters) : Worker(appContext, params) {

    override fun doWork(): ListenableWorker.Result {
        val batch = ClientLogger.readBatch(applicationContext, 50)
        if (batch.isEmpty()) return ListenableWorker.Result.success()

        val jsonArray = JSONArray()
        batch.forEach { line ->
            try {
                jsonArray.put(org.json.JSONObject(line))
            } catch (_: Exception) {
                // Skip malformed lines
            }
        }

        if (jsonArray.length() == 0) {
            ClientLogger.removeBatch(applicationContext, batch.size)
            return ListenableWorker.Result.success()
        }

        val code = NetworkClient.sendClientLogs(applicationContext, jsonArray)
        
        return when {
            code in 200..299 -> {
                ClientLogger.removeBatch(applicationContext, batch.size)
                if (ClientLogger.hasMore(applicationContext)) ListenableWorker.Result.retry() else ListenableWorker.Result.success()
            }
            code == 401 -> {
                // Jangan retry jika token salah/unauthorized
                ListenableWorker.Result.failure()
            }
            else -> {
                ListenableWorker.Result.retry()
            }
        }
    }
}
