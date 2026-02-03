(function() {
    'use strict';

    function getBridge() {
        return window.AndroidBridge || window.Android;
    }

    function parseBridgeResult(result) {
        if (result === undefined || result === null) {
            return undefined;
        }
        if (typeof result !== 'string') {
            return result;
        }
        try {
            return JSON.parse(result);
        } catch (error) {
            return result;
        }
    }

    function joinPath() {
        var cleaned = [];
        for (var i = 0; i < arguments.length; i += 1) {
            var part = arguments[i];
            if (part === undefined || part === null || String(part).length === 0) {
                continue;
            }
            cleaned.push(String(part).replace(/\\/g, '/'));
        }
        if (!cleaned.length) {
            return '';
        }
        var result = cleaned[0];
        for (var j = 1; j < cleaned.length; j += 1) {
            var next = cleaned[j].replace(/^\/+/, '');
            result = result.replace(/\/+$/, '');
            result = result + '/' + next;
        }
        return result;
    }

    function getSharedObject() {
        var bridge = getBridge();
        if (bridge && bridge.getSharedObject) {
            return parseBridgeResult(bridge.getSharedObject()) || {};
        }
        return {
            androidPaths: {
                assetPath: 'file:///android_asset',
                appPrivatePath: '',
            },
            appName: 'Entry Offline',
            isOffline: true,
        };
    }

    function getAndroidPaths() {
        var sharedObject = getSharedObject() || {};
        return sharedObject.androidPaths || {};
    }

    function resolveAndroidAssetPath() {
        var androidPaths = getAndroidPaths();
        if (!androidPaths.assetPath) {
            return undefined;
        }
        var parts = [androidPaths.assetPath];
        for (var i = 0; i < arguments.length; i += 1) {
            parts.push(arguments[i]);
        }
        return joinPath.apply(null, parts);
    }

    function resolveAndroidPrivatePath() {
        var androidPaths = getAndroidPaths();
        if (!androidPaths.appPrivatePath) {
            return undefined;
        }
        var parts = [androidPaths.appPrivatePath];
        for (var i = 0; i < arguments.length; i += 1) {
            parts.push(arguments[i]);
        }
        return joinPath.apply(null, parts);
    }

    function getByPath(obj, key) {
        if (!key) {
            return undefined;
        }
        var segments = key.split('.');
        var current = obj;
        for (var i = 0; i < segments.length; i += 1) {
            var segment = segments[i];
            if (!current || typeof current !== 'object' || !(segment in current)) {
                return undefined;
            }
            current = current[segment];
        }
        return current;
    }

    var openResolvers = [];
    var saveResolvers = [];

    window.addEventListener('android:filePicked', function(event) {
        var uri = (event && event.detail) || '';
        var resolver = openResolvers.shift();
        if (resolver) {
            resolver({
                canceled: !uri,
                filePaths: uri ? [uri] : [],
            });
        }
    });

    window.addEventListener('android:fileSaved', function(event) {
        var uri = (event && event.detail) || '';
        var resolver = saveResolvers.shift();
        if (resolver) {
            resolver({
                canceled: !uri,
                filePath: uri || undefined,
            });
        }
    });

    window.onPageLoaded = function(callback) {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(callback, 0);
            return;
        }
        window.addEventListener('load', callback, { once: true });
    };

    window.getSharedObject = function() {
        return getSharedObject();
    };

    window.dialog = {
        showOpenDialog: function(option) {
            return new Promise(function(resolve) {
                openResolvers.push(resolve);
                var bridge = getBridge();
                if (bridge && bridge.showOpenDialog) {
                    bridge.showOpenDialog(JSON.stringify(option || {}));
                    return;
                }
                resolve({ canceled: true, filePaths: [] });
            });
        },
        showSaveDialog: function(option) {
            return new Promise(function(resolve) {
                saveResolvers.push(resolve);
                var bridge = getBridge();
                if (bridge && bridge.showSaveDialog) {
                    bridge.showSaveDialog(JSON.stringify(option || {}));
                    return;
                }
                resolve({ canceled: true, filePath: undefined });
            });
        },
        showSaveDialogSync: function(option) {
            var bridge = getBridge();
            if (bridge && bridge.showSaveDialogSync) {
                bridge.showSaveDialogSync(JSON.stringify(option || {}));
            }
            return undefined;
        },
    };

    window.initNativeMenu = function() {};

    window.getLang = function(key) {
        var lang = window.Lang || {};
        return getByPath(lang, key) || key;
    };

    window.ipcInvoke = function(channel) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (channel === 'isValidAsarFile') {
            return Promise.resolve(false);
        }
        if (channel === 'getPapagoHeaderInfo') {
            return Promise.resolve({});
        }
        var bridge = getBridge();
        if (bridge && bridge.ipcInvoke) {
            var result = bridge.ipcInvoke(JSON.stringify({ channel: channel, args: args }));
            return Promise.resolve(parseBridgeResult(result));
        }
        console.warn('[AndroidBridge] ipcInvoke not implemented:', channel);
        return Promise.resolve(undefined);
    };

    window.ipcSend = function(channel) {
        var args = Array.prototype.slice.call(arguments, 1);
        var bridge = getBridge();
        if (bridge && bridge.ipcSend) {
            bridge.ipcSend(JSON.stringify({ channel: channel, args: args }));
            return;
        }
        console.warn('[AndroidBridge] ipcSend not implemented:', channel);
    };

    window.openEntryWebPage = function() {
        var bridge = getBridge();
        if (bridge && bridge.openEntryWebPage) {
            bridge.openEntryWebPage();
            return;
        }
        window.open('https://playentry.org/download/offline', '_blank', 'noopener');
    };

    window.weightsPath = function() {
        var androidAssetPath = resolveAndroidAssetPath('weights');
        if (androidAssetPath) {
            return androidAssetPath;
        }
        return 'weights';
    };

    window.getEntryjsPath = function() {
        var androidAssetPath = resolveAndroidAssetPath('node_modules', 'entry-js');
        if (androidAssetPath) {
            return androidAssetPath;
        }
        return 'node_modules/entry-js';
    };

    window.getAppPathWithParams = function() {
        var androidAssetPath = resolveAndroidAssetPath.apply(null, arguments);
        if (androidAssetPath) {
            return androidAssetPath;
        }
        var androidPrivatePath = resolveAndroidPrivatePath.apply(null, arguments);
        if (androidPrivatePath) {
            return androidPrivatePath;
        }
        return joinPath.apply(null, arguments);
    };

    window.onLoadProjectFromMain = function() {};

    window.checkPermission = function(type) {
        var bridge = getBridge();
        if (bridge && bridge.checkPermission) {
            bridge.checkPermission(type);
        }
        return Promise.resolve();
    };

    window.getPapagoHeaderInfo = function() {
        return Promise.resolve({});
    };

    window.isOffline = true;
    window.ipcListen = function() {};
    window.isOsx = false;
})();
