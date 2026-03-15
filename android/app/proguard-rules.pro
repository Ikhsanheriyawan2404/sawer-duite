# Add project specific ProGuard rules here.
-keepattributes *Annotation*
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-keepnames class okhttp3.internal.publicsuffix.PublicSuffixDatabase

# Keep PaymentData class for JSON serialization
-keep class com.ongob.paymentlistener.PaymentData { *; }
-keep class com.ongob.paymentlistener.Parser$ParsedPayment { *; }
