package kr.kro.entryoffline

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.webkit.JavascriptInterface
import androidx.core.content.ContextCompat
import org.json.JSONObject

class AndroidBridge(
    private val activity: Activity,
    private val context: Context,
    private val filePickerLauncher: (Intent) -> Unit,
    private val fileSaverLauncher: (Intent) -> Unit,
    private val downloadLauncher: (String) -> Unit,
    private val onIpcInvoke: (String) -> String?
) {

    @JavascriptInterface
    fun ipcInvoke(payload: String): String? {
        return onIpcInvoke(payload)
    }

    @JavascriptInterface
    fun ipcSend(payload: String) {
        onIpcInvoke(payload)
    }

    @JavascriptInterface
    fun getSharedObject(): String {
        val sharedObject = JSONObject()
        val androidPaths = JSONObject()
        androidPaths.put("assetPath", "file:///android_asset")
        androidPaths.put("appPrivatePath", context.filesDir.absolutePath)
        sharedObject.put("androidPaths", androidPaths)
        sharedObject.put("appName", context.getString(R.string.app_name))
        sharedObject.put("isOffline", true)
        return sharedObject.toString()
    }

    @JavascriptInterface
    fun openEntryWebPage() {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://playentry.org/download/offline"))
        ContextCompat.startActivity(context, intent, null)
    }

    @JavascriptInterface
    fun checkPermission(type: String) {
        // Permission checks should be handled via ActivityResult APIs.
        // This method is a placeholder for bridge compatibility.
    }

    @JavascriptInterface
    fun showOpenDialog(payload: String): String {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
        }
        filePickerLauncher(intent)
        return payload
    }

    @JavascriptInterface
    fun showSaveDialog(payload: String): String {
        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(Intent.EXTRA_TITLE, "entry-project")
        }
        fileSaverLauncher(intent)
        return payload
    }

    @JavascriptInterface
    fun showSaveDialogSync(payload: String): String {
        return showSaveDialog(payload)
    }

    @JavascriptInterface
    fun requestDownload(url: String) {
        downloadLauncher(url)
    }
}
