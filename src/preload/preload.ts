import { ipcRenderer } from 'electron';
import nativeMenu from './nativeMenu';
import get from 'lodash/get';
import path from 'path';
const remote = require('@electron/remote');

/**
 * Electron-only APIs used in this module:
 * - electron: ipcRenderer
 * - @electron/remote: dialog, app, getGlobal
 * - node: process.resourcesPath, process.platform
 */

type AndroidBridge = {
    ipcInvoke?: (payload: string) => string | void;
    ipcSend?: (payload: string) => void;
    getSharedObject?: () => string | GlobalConfigurations;
    openEntryWebPage?: () => void;
    openHardwarePage?: () => void;
    checkPermission?: (type: 'microphone' | 'camera') => void;
    showOpenDialog?: (payload: string) => string;
    showSaveDialog?: (payload: string) => string;
    showSaveDialogSync?: (payload: string) => string;
};

const getAndroidBridge = (): AndroidBridge | undefined =>
    (window as any).AndroidBridge || (window as any).Android;

const parseBridgeResult = <T>(result: string | void): T => {
    if (!result) {
        return undefined as T;
    }
    try {
        return JSON.parse(result) as T;
    } catch (error) {
        return result as unknown as T;
    }
};

ipcRenderer.on('console', (event: Electron.IpcRendererEvent, ...args: any[]) => {
    console.log(...args);
});

type OptionalDimension = { x?: number; y?: number; width?: number; height?: number };

ipcRenderer.on(
    'convertPng',
    (
        event: Electron.IpcRendererEvent,
        base64String: string,
        mimeType: string,
        dimension?: OptionalDimension
    ) => {
        const canvas = document.createElement('canvas');
        const { x, y, width, height } = dimension || {};
        const imageElement = width && height ? new Image(width, height) : new Image();

        imageElement.onload = function() {
            canvas.width = imageElement.width;
            canvas.height = imageElement.height;

            x && (canvas.width += x);
            y && (canvas.height += y);

            canvas
                .getContext('2d')!
                .drawImage(imageElement, x || 0, y || 0, canvas.width, canvas.height);

            const pngImage = canvas.toDataURL('image/png');
            console.log('image to png processed');
            event.sender.send('convertPng', pngImage);
            canvas.remove();
        };
        imageElement.src = `data:${mimeType};base64,${base64String}`;
    }
);

window.onPageLoaded = (callback) => {
    ipcRenderer.on('showWindow', () => {
        callback();
    });
};

window.getSharedObject = () => {
    const bridge = getAndroidBridge();
    if (!bridge?.getSharedObject) {
        return remote.getGlobal('sharedObject');
    }
    const result = bridge.getSharedObject();
    if (typeof result === 'string') {
        return parseBridgeResult<GlobalConfigurations>(result);
    }
    return result;
};
window.dialog = {
    showOpenDialog: async (option: Electron.OpenDialogOptions) => {
        const bridge = getAndroidBridge();
        if (!bridge?.showOpenDialog) {
            return remote.dialog.showOpenDialog(option);
        }
        return parseBridgeResult<Electron.OpenDialogReturnValue>(
            bridge.showOpenDialog(JSON.stringify(option))
        );
    },
    showSaveDialog: async (option: Electron.SaveDialogOptions) => {
        const bridge = getAndroidBridge();
        if (!bridge?.showSaveDialog) {
            return remote.dialog.showSaveDialog(option);
        }
        return parseBridgeResult<Electron.SaveDialogReturnValue>(
            bridge.showSaveDialog(JSON.stringify(option))
        );
    },
    showSaveDialogSync: (option: Electron.SaveDialogOptions) => {
        const bridge = getAndroidBridge();
        if (!bridge?.showSaveDialogSync) {
            return remote.dialog.showSaveDialogSync(option);
        }
        const result = parseBridgeResult<string | { filePath?: string }>(
            bridge.showSaveDialogSync(JSON.stringify(option))
        );
        return typeof result === 'string' ? result : result?.filePath;
    },
};

window.initNativeMenu = () => {
    nativeMenu.init();
};

window.getLang = (key: string) => {
    const lang = Lang || {};
    return get(lang, key) || key;
};

window.ipcInvoke = (channel: string, ...args: any[]) => {
    const bridge = getAndroidBridge();
    if (!bridge?.ipcInvoke) {
        return ipcRenderer.invoke(channel, ...args);
    }
    const result = bridge.ipcInvoke(JSON.stringify({ channel, args }));
    return Promise.resolve(parseBridgeResult(result));
};

window.ipcSend = (channel: string, ...args: any[]) => {
    const bridge = getAndroidBridge();
    if (!bridge?.ipcSend) {
        ipcRenderer.send(channel, ...args);
        return;
    }
    bridge.ipcSend(JSON.stringify({ channel, args }));
};

window.openEntryWebPage = () => {
    const bridge = getAndroidBridge();
    if (!bridge?.openEntryWebPage) {
        window.open('https://playentry.org/download/offline', '_blank', 'noopener');
        return;
    }
    bridge.openEntryWebPage();
};

window.openHardwarePage = () => {
    const bridge = getAndroidBridge();
    if (!bridge?.openHardwarePage) {
        ipcRenderer.send('openHardwareWindow');
        return;
    }
    bridge.openHardwarePage();
};

window.weightsPath = () => {
    console.log(process.env.NODE_ENV);
    return process.env.NODE_ENV === 'production'
        ? path.resolve(process.resourcesPath, 'weights')
        : path.resolve(remote.app.getAppPath(), 'node_modules', 'entry-js', 'weights');
};

window.getEntryjsPath = () => {
    return process.env.NODE_ENV === 'production'
        ? path.resolve(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'entry-js')
        : path.resolve(remote.app.getAppPath(), 'node_modules', 'entry-js');
};

window.getAppPathWithParams = (...params: string[]) => {
    console.log(process.env.NODE_ENV);
    return path.resolve(remote.app.getAppPath(), ...params);
};

/**
 * external file => loadProjectFromMain event => loadProject => callback(project)
 */
window.onLoadProjectFromMain = (callback: (project: Promise<IEntry.Project>) => void) => {
    ipcRenderer.on('loadProjectFromMain', async (e, filePath: string) => {
        const project = await ipcRenderer.invoke('loadProject', filePath);
        callback(project);
    });
};

window.checkPermission = async (type: 'microphone' | 'camera') => {
    const bridge = getAndroidBridge();
    if (!bridge?.checkPermission) {
        await ipcRenderer.invoke('checkPermission', type);
        return;
    }
    bridge.checkPermission(type);
};

window.getPapagoHeaderInfo = async () => {
    const result = await ipcRenderer.invoke('getPapagoHeaderInfo');
    return result;
};

window.isOffline = true;

window.ipcListen = ipcRenderer.on.bind(ipcRenderer);

window.isOsx = process.platform === 'darwin';
