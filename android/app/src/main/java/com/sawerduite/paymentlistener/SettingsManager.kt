package com.sawerduite.paymentlistener

import android.content.Context
import android.content.SharedPreferences

class SettingsManager(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("sawerduite_settings", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_BACKEND_URL = "backend_url"
        private const val KEY_APP_TOKEN = "app_token"
        private const val KEY_LAST_NOTIFICATION_TS = "last_notification_ts"
        private const val DEFAULT_URL = "https://sawer-api.duitebot.com"
    }

    var backendUrl: String
        get() = prefs.getString(KEY_BACKEND_URL, DEFAULT_URL) ?: DEFAULT_URL
        set(value) = prefs.edit().putString(KEY_BACKEND_URL, value).apply()

    var appToken: String
        get() = prefs.getString(KEY_APP_TOKEN, "") ?: ""
        set(value) = prefs.edit().putString(KEY_APP_TOKEN, value).apply()

    var lastNotificationTs: Long
        get() = prefs.getLong(KEY_LAST_NOTIFICATION_TS, 0L)
        set(value) = prefs.edit().putLong(KEY_LAST_NOTIFICATION_TS, value).apply()
}
