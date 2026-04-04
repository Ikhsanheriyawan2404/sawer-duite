package com.ongob.paymentlistener

import android.app.Notification
import android.os.Bundle

object NotificationTextExtractor {

    data class ExtractedText(
        val title: String,
        val text: String,
        val rawLines: String
    )

    fun extract(extras: Bundle): ExtractedText {
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
            ?: extras.getString("android.title")
            ?: ""

        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
            ?: extras.getString("android.text")
            ?: ""

        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
            ?: ""

        val linesArray = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
        val lines = linesArray?.joinToString("\n") { it.toString() } ?: ""

        val summary = extras.getCharSequence(Notification.EXTRA_SUMMARY_TEXT)?.toString()
            ?: ""

        val bestText = listOf(text, bigText, lines, summary).firstOrNull { it.isNotBlank() } ?: ""

        return ExtractedText(title = title, text = bestText, rawLines = lines)
    }
}
