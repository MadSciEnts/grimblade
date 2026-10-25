# Grimblade ARPG - Android APK Build Instructions

## Quickest Method: Instant PWA Install (No Android Studio required)
1. Open the web app URL in Google Chrome on your Android phone.
2. Tap the 3 dots menu -> "Install app" or "Add to Home screen".
3. The game installs as a native-feeling full-screen app with icon and 60fps performance!

---

## Compiling Native Android .APK with Capacitor & Android Studio

Because native Android folders (`android/` and `gradlew.bat`) are generated on demand by Capacitor, follow these exact steps in your project root terminal on your computer:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build web assets & generate/sync the Android native project (this creates the `android` folder and `gradlew.bat`):**
   ```bash
   npm run android:init
   npm run android:sync
   ```
   *(If prompted whether to overwrite existing Android platform, choose Yes or keep existing).*

3. **Open the generated project in Android Studio:**
   ```bash
   npm run android:open
   ```
   *(Or open Android Studio manually, click **File > Open**, and select the **`android`** folder inside your project directory).*

4. **Build APK in Android Studio:**
   - Wait for Gradle sync to complete.
   - Click **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
   - Your debug APK will be created at:
     `android/app/build/outputs/apk/debug/app-debug.apk`
