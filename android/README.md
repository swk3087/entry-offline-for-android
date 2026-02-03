# Android 이식 가이드 (프로젝트 포함)

이 디렉터리는 Entry Offline을 Android WebView 앱으로 이식하기 위한 기본 프로젝트 뼈대입니다.

## 필요한 파일 이동/복사 위치

### 1) Web 빌드 산출물
- Electron 렌더러 빌드 결과(HTML/CSS/JS)를 Android assets로 복사합니다.
- 위치: `android/app/src/main/assets/`
- 예시:
  - `index.html`
  - `static/` 또는 `assets/` 폴더
  - 번들 JS/CSS 파일

> 현재 `MainActivity`는 `file:///android_asset/index.html`을 로드합니다.

### 2) entry-js/weights 같은 로컬 리소스
- `src/preload/preload.ts`는 `androidPaths.assetPath`를 통해 `weights`와 `node_modules/entry-js`를 찾습니다.
- 따라서 Android assets에 다음 구조를 맞춰 넣는 것을 권장합니다.

```
android/app/src/main/assets/
  node_modules/entry-js/...
  weights/...
```

### 3) 로컬 저장소 경로
- 앱 전용 파일: `context.filesDir` (bridge에서 `appPrivatePath`로 전달)
- 캐시: `context.cacheDir`
- 공유/내보내기: SAF 사용 권장

## 브릿지 매핑 (preload와 대응)

`src/preload/preload.ts`에서 기대하는 메서드 이름에 맞춰
`AndroidBridge` 클래스가 구현되어 있습니다.

- `ipcInvoke`, `ipcSend`
- `getSharedObject`
- `showOpenDialog`, `showSaveDialog`, `showSaveDialogSync`
- `checkPermission`, `openEntryWebPage`

필요 시 이 메서드 내부 로직을 실제 기능에 맞게 구현하세요.

## 다음 단계 제안
- `ipcInvoke` 로직을 Entry Offline IPC 스펙에 맞게 구현
- 파일 선택/저장 결과를 JS 이벤트로 전달하는 처리 보강
- 권한 요청/처리 로직 추가
- WebViewAssetLoader 적용 여부 검토

