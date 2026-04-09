package com.sawerduite.paymentlistener

import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.text.TextUtils
import android.util.Log
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.NotificationManagerCompat

class MainActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private lateinit var statusTextView: TextView
    private lateinit var urlEditText: android.widget.EditText
    private lateinit var tokenEditText: android.widget.EditText
    private lateinit var saveButton: Button
    private lateinit var enableButton: Button
    private lateinit var testButton: Button
    private lateinit var settings: SettingsManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        settings = SettingsManager(this)

        statusTextView = findViewById(R.id.statusTextView)
        urlEditText = findViewById(R.id.urlEditText)
        tokenEditText = findViewById(R.id.tokenEditText)
        saveButton = findViewById(R.id.saveButton)
        enableButton = findViewById(R.id.enableButton)
        testButton = findViewById(R.id.testButton)

        // Load saved settings
        urlEditText.setText(settings.backendUrl)
        tokenEditText.setText(settings.appToken)

        saveButton.setOnClickListener {
            val url = urlEditText.text.toString().trim()
            val token = tokenEditText.text.toString().trim()

            if (url.isEmpty()) {
                Toast.makeText(this, "URL tidak boleh kosong", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            settings.backendUrl = url
            settings.appToken = token
            Toast.makeText(this, "Konfigurasi disimpan!", Toast.LENGTH_SHORT).show()
        }

        enableButton.setOnClickListener {
            openNotificationAccessSettings()
        }

        testButton.setOnClickListener {
            testBackendConnection()
        }

        // Start foreground service to keep app alive
        startKeepAliveService()

        // Schedule listener watchdog
        WatchdogScheduler.ensureScheduled(this)
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun updateStatus() {
        val isEnabled = isNotificationListenerEnabled()
        if (isEnabled) {
            statusTextView.text = "✅ Notification Access: AKTIF\n\nAplikasi siap mendengarkan notifikasi pembayaran."
            statusTextView.setTextColor(getColor(android.R.color.holo_green_dark))
            enableButton.text = "Pengaturan Notifikasi"
        } else {
            statusTextView.text = "❌ Notification Access: TIDAK AKTIF\n\nSilakan aktifkan Notification Access untuk aplikasi ini."
            statusTextView.setTextColor(getColor(android.R.color.holo_red_dark))
            enableButton.text = "Aktifkan Notification Access"
        }
        Log.d(TAG, "Notification Listener Enabled: $isEnabled")
    }

    private fun isNotificationListenerEnabled(): Boolean {
        val packageName = packageName
        val flat = Settings.Secure.getString(contentResolver, "enabled_notification_listeners")
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

    private fun openNotificationAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
            startActivity(intent)
            Toast.makeText(
                this,
                "Cari 'Sawer Duite Listener' dan aktifkan",
                Toast.LENGTH_LONG
            ).show()
        } catch (e: Exception) {
            Log.e(TAG, "Error opening notification settings", e)
            Toast.makeText(this, "Tidak dapat membuka pengaturan", Toast.LENGTH_SHORT).show()
        }
    }

    private fun startKeepAliveService() {
        val serviceIntent = Intent(this, KeepAliveService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
        Log.d(TAG, "KeepAliveService started")
    }

    private fun testBackendConnection() {
        Thread {
            try {
                val success = NetworkClient.testConnection(this)
                runOnUiThread {
                    if (success) {
                        Toast.makeText(this, "✅ Koneksi backend berhasil!", Toast.LENGTH_LONG).show()
                    } else {
                        Toast.makeText(this, "❌ Gagal terhubung ke backend", Toast.LENGTH_LONG).show()
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Test connection error", e)
                runOnUiThread {
                    Toast.makeText(this, "❌ Error: ${e.message}", Toast.LENGTH_LONG).show()
                }
            }
        }.start()
    }
}
