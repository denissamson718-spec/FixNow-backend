# FixNow Mobile App

FixNow is a mobile roadside assistance platform that connects drivers facing vehicle breakdowns with nearby mechanics in real time.

This project is configured for Expo SDK 54 and the application name is `FixNow`.

## Features in this scaffold

- Driver home dashboard with nearby mechanic discovery
- Authentication and onboarding entry screen
- Roadside assistance request form
- Live mechanic tracking flow
- Separate driver and mechanic interfaces
- Mechanic dashboard and jobs workspace
- Profile area for ratings, payments, and session control
- Shared app state with realistic sample data

## Stack

- Expo
- React Native
- TypeScript
- React Navigation
- Expo SDK 54
- Node.js
- Express.js

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run start
```

3. Open in Expo Go or run on an emulator:

```bash
npm run android
```

```bash
npm run ios
```

4. Start the shared backend in a second terminal:

```bash
cd backend && npm start
```

## Project structure

- `App.tsx`: app entry and providers
- `backend`: Express backend for auth, admin approval, accounts, requests, offers, ratings, and payments
- `web`: admin dashboard frontend (runs on localhost:3000)
- `admin-web`: legacy static admin UI (kept only for backward compatibility files)
- `admin-server`: compatibility entry that forwards to the new backend server
- `src/navigation`: root app routing
- `src/features/driver`: all driver screens and navigation
- `src/features/mechanic`: all mechanic screens and navigation
- `src/screens`: shared screens like authentication and profile
- `src/components`: reusable UI pieces
- `src/state`: shared state and actions
- `src/features/driver/data`: driver-side demo data
- `src/features/mechanic/data`: mechanic-side demo data

## Next improvements

- Replace the local JSON file store with a real database and WebSocket updates
- Add Firebase or Supabase authentication
- Integrate Stripe, Flutterwave, or local mobile money payments
- Add push notifications for mechanic alerts and arrival updates

## Admin web

Use only the React admin dashboard on port 3000.

- Run backend API: `cd backend && npm run dev` (or `npm run start`)
- Run admin dashboard frontend: `cd web && npm run dev`
- Open `http://localhost:3000` in your browser
- `http://localhost:4010/admin` now redirects to `http://localhost:3000`
- The dashboard shows the same shared account data used by the mobile app via `/api` proxy

## Password reset email setup

Forgot-password now sends real reset links by SMTP from the backend.

1. Copy `backend/.env.example` to `backend/.env`
2. Fill your SMTP values (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
3. Restart backend (`cd backend && npm run dev`)

If you test the mobile app on a physical phone, update the API base URL in [src/services/backend.ts](c:/Users/Ansi/Desktop/FixNow/src/services/backend.ts) from `localhost` to your computer's LAN IP so the phone can reach the local server.

### Maps

The Expo app uses OpenStreetMap tiles with Leaflet in a WebView on Android/iOS and an iframe on web. No Google Maps API key is required. Leaflet is bundled with the app; internet access is needed only for map tiles. The map source switch offers OpenStreetMap streets and Esri World Imagery satellite tiles. 3D camera tilt is not available.

Tile usage must follow https://operations.osmfoundation.org/policies/tiles/. Leaflet API documentation: https://leafletjs.com/reference.html.

## Render backend deployment

See [the complete Render setup guide](docs/RENDER-DEPLOYMENT.md) for Blueprint and manual setup, persistent storage, SMTP, mobile app connection, and verification. The root `render.yaml` provisions a paid backend with a persistent disk. Review the documented public-launch security blockers before using real data.
