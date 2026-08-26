# Mileage Trips

Mileage Trips is an Expo / React Native app for creating, saving, searching, printing, and sharing professional mileage trip sheets.

## Run locally

```bash
npm install
npx expo start
```

## Distribution builds

After linking the project to an Expo account:

```bash
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile production --platform all
```

The `preview` Android profile creates an installable APK for direct testing. The `production` profile creates store-ready binaries and automatically manages build numbers.

See [STORE_LISTING.md](STORE_LISTING.md) for prepared store text and [PRIVACY_POLICY.md](PRIVACY_POLICY.md) for the privacy policy.
