import { app } from 'electron';
import path from 'path';

type AndroidPaths = {
    appPrivatePath?: string;
    tempPath?: string;
    resourcePath?: string;
    assetPath?: string;
};

const getAndroidPaths = (): AndroidPaths | undefined => {
    const sharedObject = (global as { sharedObject?: { androidPaths?: AndroidPaths } })
        .sharedObject;
    return sharedObject?.androidPaths;
};

const getAndroidPath = (key: keyof AndroidPaths): string | undefined => {
    const androidPaths = getAndroidPaths();
    return androidPaths?.[key];
};

const withTrailingSeparator = (inputPath: string) =>
    inputPath.endsWith(path.sep) ? inputPath : `${inputPath}${path.sep}`;

const appPrivatePath = () => getAndroidPath('appPrivatePath') || app.getPath('userData');
const tempPath = () =>
    withTrailingSeparator(getAndroidPath('tempPath') || path.join(appPrivatePath(), 'temp'));
const resourcePath = () =>
    getAndroidPath('resourcePath') ||
    path.resolve(app.getAppPath(), 'src', 'renderer', 'resources', 'uploads');
const assetPath = (...parts: string[]) =>
    getAndroidPath('assetPath')
        ? path.join(getAndroidPath('assetPath') as string, ...parts)
        : path.resolve(app.getAppPath(), ...parts);

const PlatformPaths = {
    appPrivatePath,
    tempPath,
    resourcePath,
    assetPath,
};

export default PlatformPaths;
