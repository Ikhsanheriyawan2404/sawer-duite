package com.sawerduite.paymentlistener

import android.util.Log

object Parser {

    private const val TAG = "Parser"

    // Data class untuk hasil parsing
    data class ParsedPayment(
        val amount: Long,
        val bank: String,
        val provider: String // "DANA" or "GOPAY"
    )

    /**
     * Parse text notifikasi pembayaran
     */
    fun parsePaymentText(text: String, packageName: String): ParsedPayment {
        Log.d(TAG, "Parsing text from $packageName: $text")

        val provider = when {
            packageName.contains("gojek") || packageName.contains("gopay") -> "GOPAY"
            else -> "DANA"
        }

        val amount = parseAmount(text)
        val bank = if (provider == "GOPAY") {
            parseGoPayBank(text)
        } else {
            parseBank(text)
        }

        Log.d(TAG, "Parsed - Provider: $provider, Amount: $amount, Bank: $bank")

        return ParsedPayment(amount, bank, provider)
    }

    /**
     * Parse nominal rupiah dari text
     */
    fun parseAmount(text: String): Long {
        val patterns = listOf(
            Regex("""Rp\.?\s?([\d.,]+)""", RegexOption.IGNORE_CASE),
            Regex("""([\d.,]+)\s?(?:rupiah|rp)""", RegexOption.IGNORE_CASE)
        )

        for (pattern in patterns) {
            val matchResult = pattern.find(text)
            if (matchResult != null) {
                var rawAmount = matchResult.groupValues[1]
                
                // Jika tertangkap titik di awal (misal dari Rp.1.000), bersihkan
                if (rawAmount.startsWith(".")) {
                    rawAmount = rawAmount.substring(1)
                }

                // Hapus titik dan koma, konversi ke Long (Format ID: 1.000 atau 1.000,00)
                // Kita ambil angka saja untuk keamanan
                val cleanAmount = rawAmount.replace(Regex("""[^\d]"""), "").trim()

                return try {
                    cleanAmount.toLong()
                } catch (e: Exception) {
                    0L
                }
            }
        }
        return 0L
    }

    /**
     * Khusus GoPay Merchant seringkali tidak menyebutkan bank pengirim
     * Teks: "Pembayaran QRIS Rp 1.000 di Iky Mochi, CWRNGN telah diterima"
     */
    private fun parseGoPayBank(text: String): String {
        // Jika ada kata "dari [BANK]", gunakan logic bank umum
        val bankFromText = parseBank(text)
        if (bankFromText != "UNKNOWN") return bankFromText

        // Jika tidak ada, kembalikan QRIS sebagai default bank/method
        return "QRIS"
    }

    /**
     * Parse nama bank dari text (umumnya untuk DANA)
     */
    fun parseBank(text: String): String {
        val knownBanks = listOf(
            "BRI", "BCA", "BNI", "MANDIRI", "CIMB", "CIMB NIAGA",
            "PERMATA", "DANAMON", "MEGA", "BTN", "BTPN", "JENIUS",
            "OCBC", "OCBC NISP", "MAYBANK", "PANIN", "HSBC",
            "STANDARD CHARTERED", "CITIBANK", "UOB", "DBS",
            "BANK JAGO", "JAGO", "SEABANK", "SEA BANK", "OVO",
            "GOPAY", "SHOPEEPAY", "LINKAJA", "KREDIVO",
            "BANK SYARIAH INDONESIA", "BSI",
            "KROM", "NEO", "BNC", "RAYA", "ALO", "ALLO", "DIGIBANK", "TMRW", "LINE", "BLU"
        )

        val upperText = text.uppercase()

        // Regex ditingkatkan: izinkan titik dan koma di dalam nama bank (misal: PT ..., TBK)
        val dariPattern = Regex("""DARI\s+(?:BANK\s+)?([A-Z\s.,]+?)(?:\s+BERHASIL|\s+TELAH|\s+KE|\s+UNTUK|$)""")
        val dariMatch = dariPattern.find(upperText)

        if (dariMatch != null) {
            val potentialBank = dariMatch.groupValues[1].trim()
            for (bank in knownBanks) {
                if (potentialBank.contains(bank)) return bank
            }
            // Fallback: ambil kata pertama jika tidak terdaftar di knownBanks tapi tertangkap regex DARI
            if (potentialBank.isNotEmpty()) return potentialBank.split(" ")[0]
        }

        for (bank in knownBanks) {
            if (upperText.contains(bank)) return bank
        }

        return "UNKNOWN"
    }
}
