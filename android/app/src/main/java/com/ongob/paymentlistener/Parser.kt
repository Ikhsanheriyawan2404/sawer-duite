package com.ongob.paymentlistener

import android.util.Log

object Parser {

    private const val TAG = "Parser"

    // Data class untuk hasil parsing
    data class ParsedPayment(
        val amount: Long,
        val bank: String
    )

    /**
     * Parse text notifikasi pembayaran DANA
     *
     * Format yang didukung:
     * - "Rp5.000 dari BRI berhasil diterima DANA Bisnis"
     * - "Rp50.000 dari BCA berhasil diterima"
     * - "Rp1.500.000 dari MANDIRI berhasil diterima DANA Bisnis"
     * - "Pembayaran Rp100.000 dari BNI telah diterima"
     */
    fun parsePaymentText(text: String): ParsedPayment {
        Log.d(TAG, "Parsing text: $text")

        val amount = parseAmount(text)
        val bank = parseBank(text)

        Log.d(TAG, "Parsed - Amount: $amount, Bank: $bank")

        return ParsedPayment(amount, bank)
    }

    /**
     * Parse nominal rupiah dari text
     *
     * Regex patterns:
     * - Rp5.000 -> 5000
     * - Rp50.000 -> 50000
     * - Rp1.500.000 -> 1500000
     * - Rp 100.000 -> 100000 (dengan spasi)
     * - Rp100,000 -> 100000 (dengan koma)
     */
    fun parseAmount(text: String): Long {
        // Pattern untuk menangkap nominal Rupiah
        // Mendukung: Rp5.000, Rp 50.000, Rp1.500.000, Rp100,000
        val patterns = listOf(
            // Pattern utama: Rp diikuti angka dengan titik/koma sebagai pemisah ribuan
            Regex("""Rp\s?([\d.,]+)""", RegexOption.IGNORE_CASE),
            // Pattern alternatif: angka dengan Rupiah
            Regex("""([\d.,]+)\s?(?:rupiah|rp)""", RegexOption.IGNORE_CASE)
        )

        for (pattern in patterns) {
            val matchResult = pattern.find(text)
            if (matchResult != null) {
                val rawAmount = matchResult.groupValues[1]
                Log.d(TAG, "Raw amount found: $rawAmount")

                // Hapus titik dan koma, konversi ke Long
                val cleanAmount = rawAmount
                    .replace(".", "")
                    .replace(",", "")
                    .trim()

                return try {
                    cleanAmount.toLong()
                } catch (e: NumberFormatException) {
                    Log.e(TAG, "Failed to parse amount: $cleanAmount", e)
                    0L
                }
            }
        }

        Log.w(TAG, "No amount found in text")
        return 0L
    }

    /**
     * Parse nama bank dari text
     *
     * Mendukung berbagai format bank:
     * - "dari BRI berhasil"
     * - "dari Bank BCA"
     * - "dari MANDIRI"
     */
    fun parseBank(text: String): String {
        // Daftar bank yang umum
        val knownBanks = listOf(
            "BRI", "BCA", "BNI", "MANDIRI", "CIMB", "CIMB NIAGA",
            "PERMATA", "DANAMON", "MEGA", "BTN", "BTPN", "JENIUS",
            "OCBC", "OCBC NISP", "MAYBANK", "PANIN", "HSBC",
            "STANDARD CHARTERED", "CITIBANK", "UOB", "DBS",
            "BANK JAGO", "JAGO", "SEABANK", "SEA BANK", "OVO",
            "GOPAY", "SHOPEEPAY", "LINKAJA", "KREDIVO",
            "BANK SYARIAH INDONESIA", "BSI"
        )

        val upperText = text.uppercase()

        // Cari pattern "dari [BANK]"
        val dariPattern = Regex("""DARI\s+(?:BANK\s+)?([A-Z\s]+?)(?:\s+BERHASIL|\s+TELAH|\s+KE|\s+UNTUK|$)""")
        val dariMatch = dariPattern.find(upperText)

        if (dariMatch != null) {
            val potentialBank = dariMatch.groupValues[1].trim()
            Log.d(TAG, "Potential bank from 'dari' pattern: $potentialBank")

            // Cek apakah ada bank yang cocok
            for (bank in knownBanks) {
                if (potentialBank.contains(bank)) {
                    return bank
                }
            }

            // Jika tidak ada yang cocok tapi ada kata, gunakan kata pertama
            val words = potentialBank.split(" ")
            if (words.isNotEmpty() && words[0].length >= 2) {
                return words[0]
            }
        }

        // Fallback: cari langsung nama bank di text
        for (bank in knownBanks) {
            if (upperText.contains(bank)) {
                return bank
            }
        }

        Log.w(TAG, "No bank found in text")
        return "UNKNOWN"
    }

    /**
     * Validasi apakah text adalah notifikasi pembayaran yang valid
     */
    fun isValidPaymentNotification(text: String): Boolean {
        val lowerText = text.lowercase()

        // Harus mengandung indikator pembayaran masuk
        val hasPaymentIndicator = listOf(
            "berhasil diterima",
            "telah diterima",
            "pembayaran masuk",
            "dana masuk",
            "transfer masuk"
        ).any { lowerText.contains(it) }

        // Harus mengandung nominal Rupiah
        val hasAmount = parseAmount(text) > 0

        return hasPaymentIndicator && hasAmount
    }
}
