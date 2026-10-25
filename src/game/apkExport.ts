/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';

export async function generateAndroidApkPackageZip(): Promise<Blob> {
  const zip = new JSZip();

  // 1. Android Manifest
  const manifestXml = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.grimblade.arpg">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="Grimblade ARPG"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
        android:hardwareAccelerated="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name="com.getcapacitor.BridgeActivity"
            android:label="Grimblade ARPG"
            android:theme="@android:style/Theme.NoTitleBar.Fullscreen"
            android:screenOrientation="sensorLandscape"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  // 2. Capacitor Config
  const capacitorConfig = {
    appId: 'com.grimblade.arpg',
    appName: 'Grimblade: 16-Bit Action RPG',
    webDir: 'dist',
    bundledWebRuntime: false,
    server: {
      androidScheme: 'https',
    },
    android: {
      allowMixedContent: true,
      captureInput: true,
      webContentsDebuggingEnabled: false,
    },
  };

  // 3. Android build.gradle
  const buildGradle = `apply plugin: 'com.android.application'

android {
    namespace "com.grimblade.arpg"
    compileSdk 34

    defaultConfig {
        applicationId "com.grimblade.arpg"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation project(':capacitor-android')
}`;

  // 4. Instructions README
  const readme = `# Grimblade ARPG - Android APK Build Instructions

## Quickest Method 1: Instant Android Install (Recommended)
You don't need Android Studio to play this on Android!
1. Open this game in Google Chrome on your Android phone.
2. Tap the 3 dots in the top right of Chrome (or tap the in-game 'Install PWA' button).
3. Select "Install App" or "Add to Home screen".
4. The game will install directly to your app drawer with the full custom icon, standalone fullscreen landscape mode, and 60fps hardware acceleration!

---

## Method 2: Compile Native Android .APK with Capacitor & Android Studio
To compile the official release APK file:

1. Unzip this package.
2. In your terminal, run:
   \`\`\`bash
   npm install
   npm run build
   npx cap sync android
   npx cap open android
   \`\`\`
3. Android Studio will open the project.
4. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Your release APK will be generated at:
   \`android/app/build/outputs/apk/debug/app-debug.apk\`
6. Transfer \`app-debug.apk\` to your Android phone and install!
`;

  // 5. Add files to zip
  zip.file('README_BUILD_APK.md', readme);
  zip.file('capacitor.config.json', JSON.stringify(capacitorConfig, null, 2));
  zip.folder('android/app/src/main')?.file('AndroidManifest.xml', manifestXml);
  zip.folder('android/app')?.file('build.gradle', buildGradle);

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadAndroidPackage() {
  generateAndroidApkPackageZip().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grimblade-android-apk-project.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
