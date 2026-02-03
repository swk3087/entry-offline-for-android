package kr.kro.entryoffline

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.DownloadListener
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.net.toUri
import kr.kro.entryoffline.databinding.ActivityMainBinding

class MainActivity : ComponentActivity() {
    private lateinit var binding: ActivityMainBinding

    private val openDocumentLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val dataUri = result.data?.data
        val safeUri = org.json.JSONObject.quote(dataUri?.toString() ?: "")
        binding.webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('android:filePicked', { detail: ${safeUri} }));",
            null
        )
    }

    private val saveDocumentLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        val dataUri = result.data?.data
        val safeUri = org.json.JSONObject.quote(dataUri?.toString() ?: "")
        binding.webView.evaluateJavascript(
            "window.dispatchEvent(new CustomEvent('android:fileSaved', { detail: ${safeUri} }));",
            null
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        setupWebView(binding.webView)

        val bridge = AndroidBridge(
            activity = this,
            context = this,
            filePickerLauncher = { intent -> openDocumentLauncher.launch(intent) },
            fileSaverLauncher = { intent -> saveDocumentLauncher.launch(intent) },
            downloadLauncher = { url -> startDownload(url) },
            onIpcInvoke = { payload -> payload }
        )
        binding.webView.addJavascriptInterface(bridge, "AndroidBridge")

        binding.webView.loadUrl("file:///android_asset/index.html")
    }

    private fun setupWebView(webView: WebView) {
        with(webView.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            allowFileAccessFromFileURLs = true
            allowUniversalAccessFromFileURLs = true
            mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
            cacheMode = WebSettings.LOAD_DEFAULT
            mediaPlaybackRequiresUserGesture = false
        }

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                return false
            }
        }

        webView.webChromeClient = WebChromeClient()

        webView.setDownloadListener(DownloadListener { url, _, _, _, _ ->
            startDownload(url)
        })
    }

    private fun startDownload(url: String) {
        val request = DownloadManager.Request(Uri.parse(url)).apply {
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalPublicDir("Download", url.toUri().lastPathSegment ?: "entry")
        }
        val manager = getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)
    }

    override fun onBackPressed() {
        if (binding.webView.canGoBack()) {
            binding.webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
