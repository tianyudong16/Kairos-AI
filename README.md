# Kairos AI

Mobile-first scheduling companion that aligns tasks with your energy peaks. Built with **Expo + React Native** so the same codebase can run on web, iOS, and Android — ready for App Store and Play Store distribution via EAS Build.

## Screens

1. **Onboarding** — chronotype selection  
2. **Dashboard** — energy pulse + daily schedule  
3. **AI Input** — natural-language task parsing  
4. **Analytics** — focus score + circadian curve  
5. **AI Coach** — co-pilot chat

## Run in the browser

```bash
npm install
npm run web
```

Then open the URL Expo prints (usually `http://localhost:8081`).

## Run on a phone

```bash
npm start
```

Scan the QR code with Expo Go (Android) or the Camera app (iOS).

## App Store / Play Store path

This project is Expo-ready. When you want store builds:

1. Install EAS CLI: `npm i -g eas-cli`
2. `eas login`
3. `eas build:configure`
4. `eas build --platform ios` / `eas build --platform android`
5. `eas submit` to ship to App Store Connect / Google Play

Update `ios.bundleIdentifier` and `android.package` in `app.json` before production.

## Design source

Wireframe flow: [Kairos AI Figma Site](https://purr-bunch-24702901.figma.site)
