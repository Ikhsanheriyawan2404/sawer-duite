package com.ongob.paymentlistener

import android.content.Context
import android.content.SharedPreferences

class SettingsManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("ongob_settings", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_APP_TOKEN = "app_token"
        private const val DEFAULT_URL = "https://saweran-api.duitebot.com"
    }

    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, DEFAULT_URL) ?: DEFAULT_URL
        set(value) = prefs.edit().putString(KEY_BACKEND_URL, value).apply()

    var appToken: String
        get() = prefs.getString(KEY_APP_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_APP_TOKEN, value).apply()
}
