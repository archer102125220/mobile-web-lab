package com.example.navigatorlanguagedemo

import android.annotation.SuppressLint
import android.os.Build
import android.os.Bundle
import android.os.LocaleList
import android.webkit.JavascriptInterface
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.os.ConfigurationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Locale
import java.util.TimeZone

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val SERVER_BASE_URL = BuildConfig.SERVER_BASE_URL

    // 【NativeBridge 介面提供給 Web 端呼叫】
    inner class WebAppInterface {

        @JavascriptInterface
        fun getNativeLocale(): String {
            return Locale.getDefault().toLanguageTag()
        }

        @JavascriptInterface
        fun getNativeLocaleJson(): String {
            return generateNativeLocaleJson()
        }
    }

    private fun generateNativeLocaleJson(): String {
        val jsonObj = JSONObject()
        val defaultLocale = Locale.getDefault()
        val systemLocaleTag = defaultLocale.toLanguageTag()

        jsonObj.put("platform", "Android WebView (Native)")
        jsonObj.put("systemLocale", systemLocaleTag)
        jsonObj.put("timezone", TimeZone.getDefault().id)
        jsonObj.put("osVersion", "Android SDK ${Build.VERSION.SDK_INT} (${Build.VERSION.RELEASE})")
        jsonObj.put("deviceModel", "${Build.MANUFACTURER} ${Build.MODEL}")

        // 收集偏好語言清單 (LocaleList)
        val preferredList = JSONArray()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            val localeList = LocaleList.getDefault()
            for (i in 0 until localeList.size()) {
                preferredList.put(localeList.get(i).toLanguageTag())
            }
        } else {
            preferredList.put(systemLocaleTag)
        }
        jsonObj.put("preferredLanguages", preferredList)

        // Configuration Locales
        val configLocales = ConfigurationCompat.getLocales(resources.configuration)
        val configList = JSONArray()
        for (i in 0 until configLocales.size()) {
            configList.put(configLocales.get(i)?.toLanguageTag() ?: "")
        }
        jsonObj.put("configurationLocales", configList)

        return jsonObj.toString()
    }

    private fun sendNativeLocaleToWeb() {
        val jsonStr = generateNativeLocaleJson()
        val script = "if (window.onNativeLocaleReceived) { window.onNativeLocaleReceived($jsonStr); }"
        runOnUiThread {
            webView.evaluateJavascript(script, null)
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this)
        setContentView(webView)

        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            loadWithOverviewMode = true
            useWideViewPort = true
        }

        webView.addJavascriptInterface(WebAppInterface(), "NativeBridge")

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                sendNativeLocaleToWeb()
            }

            override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                super.onReceivedError(view, request, error)
                if (request?.isForMainFrame == true) {
                    val errMsg = "無法連線至 Web 伺服器: $SERVER_BASE_URL\n請確認 Node.js server.js 已啟動！"
                    Toast.makeText(this@MainActivity, errMsg, Toast.LENGTH_LONG).show()
                }
            }
        }

        loadWebServer()
    }

    private fun loadWebServer() {
        if (SERVER_BASE_URL.isNotEmpty()) {
            webView.loadUrl(SERVER_BASE_URL)
        } else {
            Toast.makeText(this, "未配置 SERVER_BASE_URL", Toast.LENGTH_LONG).show()
        }
    }

    override fun onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
