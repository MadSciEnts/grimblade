# Grimblade ARPG - Android APK Build Instructions

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
   ```bash
   npm install
   npm run build
   npx cap sync android
   npx cap open android
   ```
3. Android Studio will open the project.
4. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
5. Your release APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`
6. Transfer `app-debug.apk` to your Android phone and install!
