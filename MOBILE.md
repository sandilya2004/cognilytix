# Cognilytix iPhone and Android app

The website remains available at https://cognilytix.app/. Capacitor packages the same application for iPhone and Android; it does not replace the website.

## Prepared here

- Capacitor core, iOS, Android and development CLI dependencies.
- App ID: `app.lovable.fbb87607493049708aa6030cb9c65ba3`.
- App name: `cognilytix`.
- Web output directory: `dist`.
- A development-only server URL for testing the current preview on devices.

Native platform folders and signed app binaries are not generated here. Store publishing and native-device testing still need to be completed locally.

## Run on your computer

1. Export/connect this project to your own GitHub repository from Lovable and download the latest code.
2. Install a current Node.js version supported by Capacitor 8 (Node 22 or newer), then run `npm install`.
3. For Android, install Android Studio and its SDK. For iPhone, use a Mac with Xcode and its command-line tools.
4. Add the platforms you need:

   ```bash
   npx cap add android
   npx cap add ios
   ```

5. Update native dependencies for the selected platform:

   ```bash
   npx cap update android
   npx cap update ios
   ```

6. Build and sync:

   ```bash
   npm run build
   npx cap sync
   ```

7. Run on a connected device or emulator:

   ```bash
   npx cap run android
   npx cap run ios
   ```

Run only the commands for platforms installed on your computer. The configured preview URL requires internet and may be subject to preview access restrictions; it is not a production app endpoint.

After any update, first download/pull the latest code from your connected repository, install dependencies if changed, run `npm run build`, and run `npx cap sync` before opening/running the native project.

## Before App Store / Google Play release

- Remove the entire `server` section from `capacitor.config.ts`, then rebuild and sync so the app bundles its own production web files instead of loading the development preview.
- Register Apple Developer and Google Play Console accounts; fees apply. Configure signing and release builds in Xcode / Android Studio.
- Add final app icons, launch assets, store screenshots, support details, privacy disclosures, and account-deletion support if required by the stores.
- Test email login, Google login, password recovery, account restoration, file uploads and report exports on actual devices. Google login cannot be assumed to work inside an embedded web view; a system-browser/native callback flow may be needed.
- Review Apple and Google rules for digital subscriptions before exposing the existing Paddle web checkout in the app. Store billing changes may be required depending on storefront and eligibility; existing website payments were not changed.
- Test layout, safe areas, keyboard behavior, back navigation and network failures on both platforms.
- Submit for review; approval is not guaranteed simply by wrapping a website.

No offline mode, push notifications, camera access, native OAuth or store billing was added in this setup.

## Read before proceeding

- Lovable mobile guide: https://lovable.dev/blog/build-native-mobile-apps
- Capacitor setup: https://capacitorjs.com/docs/getting-started