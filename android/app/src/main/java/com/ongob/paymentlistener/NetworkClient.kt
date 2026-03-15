package com.ongob.paymentlistener

import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object NetworkClient {

    private const val TAG = "NetworkClient"

    // Backend URL - ganti dengan URL production
    private const val BACKEND_URL = "http://192.168.1.10:3000/health"
    // Untuk emulator Android gunakan: "http://10.0.2.2:3000/health"

    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()

    private val client: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
            .build()
    }

    fun sendPaymentData(paymentData: PaymentData): Boolean {
        return try {
            val jsonBody = JSONObject().apply {
                put("title", paymentData.title)
                put("message", paymentData.message)
                put("amount", paymentData.amount)
                put("bank", paymentData.bank)
                put("source", paymentData.source)
            }

            Log.d(TAG, "Request URL: $BACKEND_URL")
            Log.d(TAG, "Request Body: $jsonBody")

            val requestBody = jsonBody.toString().toRequestBody(JSON_MEDIA_TYPE)

            val request = Request.Builder()
                .url(BACKEND_URL)
                .post(requestBody)
                .addHeader("Content-Type", "application/json")
                .addHeader("Accept", "application/json")
                .build()

            client.newCall(request).execute().use { response ->
                val responseBody = response.body?.string()
                Log.d(TAG, "Response Code: ${response.code}")
                Log.d(TAG, "Response Body: $responseBody")

                if (response.isSuccessful) {
                    Log.d(TAG, "✅ Payment data sent successfully")
                    true
                } else {
                    Log.e(TAG, "❌ Server returned error: ${response.code}")
                    false
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Network error", e)
            false
        }
    }
}

// Data class untuk payment
data class PaymentData(
    val title: String,
    val message: String,
    val amount: Long,
    val bank: String,
    val source: String
)
