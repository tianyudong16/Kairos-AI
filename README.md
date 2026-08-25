# Kairos AI

Mobile-first scheduling companion that aligns tasks with your energy peaks. Built with **Expo + React Native** so the same codebase can run on web, iOS, and Android — ready for App Store and Play Store distribution via EAS Build.

## Screens

1. **Onboarding** — chronotype selection  
2. **Dashboard** — energy pulse + daily schedule  
3. **AI Input** — natural-language task parsing  
4. **Analytics** — focus score + circadian curve  
5. **AI Coach** — co-pilot chat

## Get the latest code

The real app lives on **`main`**. After cloning (or anytime you want updates):

```bash
git checkout main
git pull origin main
```

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

## Share a hosted link (no Node for friends)

```bash
npx expo export --platform web
npx firebase-tools deploy --only hosting
```

Send them the URL Firebase prints (e.g. `https://kairos-ai-13e53.web.app`).

## Full backend deploy (required for login + Google Calendar on the hosted URL)

Friends using your hosted link need Cloud Functions + Firestore — not just the static web build:

```bash
cd functions && npm install && cd ..
npx firebase-tools login
npx firebase-tools deploy --only functions,firestore
npx expo export --platform web
npx firebase-tools deploy --only hosting
```

What this enables:
- **Sign up / sign in / sign out** — accounts stored in Firestore (`accounts`, `sessions`, `users/{uid}/data/workspace`)
- **Google Calendar** — tokens stored per user under `users/{uid}/calendarConnections/google`
- **OAuth return** — after Google connect, users land back on your hosted URL (not localhost)

Optional: set the hosted URL explicitly before export:

```bash
# .env
EXPO_PUBLIC_APP_URL=https://kairos-ai-13e53.web.app
```

### Google Calendar for other Gmail accounts

If Google Connect says the app is blocked / not verified for another email, open [Google Cloud Console](https://console.cloud.google.com/) → your OAuth client project → **OAuth consent screen** → **Test users** → add their Gmail. (While the app is in Testing mode, only listed emails can connect Google Calendar.)

## AI Coach (live Gemini chatbot)

Free-form coach chat uses **Google Gemini** through Cloud Function `coachChat` (not preset keyword replies).

```bash
# Get a key at https://aistudio.google.com/apikey
npx firebase-tools functions:secrets:set GEMINI_API_KEY

# Redeploy so coachChat picks up the secret
npx firebase-tools deploy --only functions
```

Optional: you can also use OpenAI later, but Gemini alone is enough.

Until a key is set, typed messages will tell you AI isn’t live yet. Action cards still work locally.

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
