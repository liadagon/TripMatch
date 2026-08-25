# TripMatch

## Project Overview

TripMatch is a full-stack, end-to-end web application for people looking for compatible travel partners. It helps users move from creating a travel profile to discovering people with similar plans, expressing interest, forming reciprocal matches, and chatting with those matches.

The core journey is: authenticate, complete onboarding and travel preferences, browse Discover, like or skip profiles, review received likes and matches, then use chat and the matches map. The repository contains a React client, an Express API, MongoDB persistence, GridFS media storage, and optional third-party integrations. It is documented for local development and does not assume a production deployment.

## Key Features

- Local registration and password login, Firebase Google sign-in, and email one-time-code authentication delivered through Brevo.
- Multi-step onboarding for profile photos, personal details, travel preferences, questionnaire answers, and a structured trip destination.
- App-owned profile-photo upload, profile editing, profile preview, and account deletion.
- Discover results with persisted like/skip decisions and reciprocal match creation.
- Received Likes, active Matches, matched-profile views, and privacy-aware match data.
- Persistent match conversations and messages, plus user-local conversation clearing.
- Reversible block/unblock controls for matched users.
- A Leaflet matches map using Geoapify tiles and stored trip coordinates.
- Optional Boost subscription lifecycle through the PayPal sandbox, including approval, status refresh, cancellation, entitlement checks, and verified/deduplicated webhooks.
- Account-scoped demo profiles and interactions that supplement sparse local data and provide a usable demonstration flow. Demo state is stored in the browser; real users, swipes, matches, and conversations remain API-backed.
- Protected navigation, loading and error states, responsive layouts, and a custom not-found page.

## Tech Stack

### Frontend

- React 19 and TypeScript
- Vite 8
- React Router 7
- Axios
- Context API
- Redux Toolkit and React Redux
- Firebase Authentication client SDK
- Leaflet and React Leaflet
- Geoapify map tiles and geocoding
- Lucide React icons

### Backend

- Node.js and Express 4
- Mongoose
- Joi request validation
- JSON Web Tokens and bcrypt
- Multer
- Helmet, CORS, and express-rate-limit
- Firebase Admin for Google token verification
- Brevo transactional email integration
- PayPal REST API integration

### Database

- MongoDB for application records
- MongoDB GridFS (`profileImages` bucket) for uploaded profile images

## Architecture

The frontend follows this request path:

```text
React page/component -> custom hook or Context/Redux -> service module -> Axios -> Express API
```

Route-level pages are declared in `client/src/App.tsx`. Shared session state lives in `client/src/context`, conversation state lives in `client/src/store`, and API calls are isolated in `client/src/services`. The Axios instance attaches the locally stored JWT as a Bearer token.

The backend follows this request path:

```text
Express route -> authentication/onboarding middleware -> Joi validation -> controller -> service/model -> MongoDB or GridFS
```

`server/app.js` configures HTTP middleware and mounts route groups under `/api`. Controllers coordinate responses, services contain integrations and business operations, Mongoose models define persistence, and validation modules protect request bodies, parameters, and queries.

## Project Structure

```text
tripmatch/
|-- client/
|   |-- public/
|   |-- scripts/
|   `-- src/
|       |-- Components/
|       |-- context/
|       |-- data/
|       |-- hooks/
|       |-- services/
|       |-- store/
|       |-- types/
|       `-- utils/
|-- server/
|   |-- config/
|   |-- constants/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- scripts/
|   |-- services/
|   |-- utils/
|   `-- validation/
|-- postman/
`-- README.md
```

## Database Models

- **User** stores authentication provider data, hashed local credentials, onboarding/profile fields, travel preferences, photo URLs, and Boost subscription state. Public serialization removes passwords and internal fields.
- **Swipe** records a unique directed `like` or `skip` from one user to another.
- **Match** represents a unique pair of users created from reciprocal interest.
- **Conversation** belongs to one match, references its two participants, embeds messages, and records per-user clear timestamps.
- **Block** records a unique blocker/blocked-user relationship.
- **EmailOtp** stores a hashed, expiring, single-use email code with resend and attempt metadata; MongoDB TTL cleanup is configured on its expiration field.
- **ProcessedPayPalWebhookEvent** records PayPal event IDs and processing state to make webhook handling idempotent.

Profile-image binaries are stored separately in the GridFS `profileImages` bucket. GridFS metadata associates each uploaded image with its owner, while the `User` document stores the app-owned `/api/file/:fileId` URL.

## Authentication & Security

- Local passwords are hashed with bcrypt before persistence and are excluded from normal queries and serialized user data.
- Successful local, Google, and email-code authentication returns a signed JWT. The client stores it locally and sends `Authorization: Bearer <token>` through its Axios interceptor.
- Protected API routes resolve the JWT to a current user; `GET /api/auth/me` restores and verifies the authenticated session.
- Firebase Admin verifies Google ID tokens on the server. Email OTPs are hashed, expire after ten minutes, are single-use, and have resend and attempt limits.
- Joi validates request bodies, path parameters, and query strings. Completed onboarding is required for discovery, matching, conversation, blocking, and subscription routes.
- Helmet supplies security headers, CORS is limited by `CLIENT_URL`, and API/auth/OTP rate limiters reduce abuse.
- Multer validates upload type and size before GridFS storage. Central 404 and error middleware return controlled JSON responses.
- Environment files hold local configuration and secrets. `.env` files, keys, credentials, and service-account files are ignored by Git; only placeholder `.env.example` files should be committed.

## State Management

### Context API

`AuthContext` owns the authenticated user, initialization state, login and registration flows, Google and email-code authentication, profile refreshes, logout, account deletion, and JWT-backed session restoration through `/api/auth/me`. The `useAuth` hook exposes that state to protected routes and pages.

### Redux Toolkit

The Redux store owns real conversation state. Async thunks fetch the conversation list and active conversation, send messages, and clear a conversation, while the slice tracks loading, success, and error states. The typed `useConversations` hook combines selectors, dispatch, and those actions for chat components.

Demo interactions are intentionally separate: they are scoped to the authenticated account and persisted in browser `localStorage`, not MongoDB.

## Media Uploads

Authenticated clients upload one `file` using `multipart/form-data` to `POST /api/file`. Multer buffers and accepts JPEG, PNG, WebP, or GIF images up to 5 MB. The backend assigns a random filename, stores the bytes and owner metadata in GridFS, and returns an app-owned URL. Profiles support up to six photo URLs.

`GET /api/file/:fileId` streams stored media with its content type and cache headers. Frontend profile, discovery, likes, matches, and chat views render these dynamic URLs through reusable image handling, including a `SafeImage` fallback when a source is missing or fails.

## Performance & UX

- Application pages are loaded with `React.lazy` and rendered through `Suspense` with a shared loading state.
- The matches map memoizes marker components and calculated map data with `memo` and `useMemo`; selected async handlers use `useCallback`.
- A root `ErrorBoundary`, authentication restoration error screen, request-specific loading/error states, and the API error handler provide recovery paths.
- Responsive CSS breakpoints cover phone, tablet, and desktop layouts, with reduced-motion handling in relevant screens.
- Protected routes enforce authentication and onboarding state, while an explicit wildcard route renders the 404 page.

## Prerequisites

- Node.js and npm
- A reachable MongoDB instance
- Optional provider accounts only for the features you intend to exercise: Firebase/Google, Brevo email OTP, Geoapify maps, or PayPal sandbox Boost

## Clone

```bash
git clone <repository-url>
cd tripmatch
```

## Install Backend

```bash
cd server
npm install
```

Create the local backend configuration from the committed template:

```bash
cp .env.example .env
```

On Windows PowerShell, use `Copy-Item .env.example .env`. At minimum, set a reachable `DATABASE_URL`, a long random `JWT_SECRET`, and the correct `CLIENT_URL`. Keep all real values out of version control.

Start the API:

```bash
npm run dev
```

Use `npm start` to run it without Nodemon. By default, the API listens on `http://127.0.0.1:5000`; `GET /api/health` provides a health check.

## Install Frontend

In a second terminal:

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, replace the copy command with `Copy-Item .env.example .env`. The default client runs at `http://localhost:5173` and sends API calls to `VITE_API_URL=http://localhost:5000`.

## Environment Configuration

The example files list every supported key. Configure only the integrations needed for the feature being tested.

| Area | Client variables | Server variables |
| --- | --- | --- |
| Core API | `VITE_API_URL` | `NODE_ENV`, `PORT`, `DOMAIN_BASE`, `DATABASE_URL`, `CLIENT_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN` |
| Google sign-in | `VITE_FIREBASE_*` | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Email OTP | None | `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`; `BREVO_TEST_EMAIL` is used by the verification script |
| Maps/location | `VITE_GEOAPIFY_API_KEY` | None |
| PayPal Boost | None | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `PAYPAL_PRODUCT_ID`, `PAYPAL_PLAN_ID_BOOST`, `PAYPAL_WEBHOOK_ID` |

`PAYPAL_BASE_URL` defaults to the sandbox endpoint in `.env.example`. Do not use live credentials for local development or demonstrations.

## Available Commands

From `client/`:

```bash
npm run dev
npm run build
npm run lint
```

From `server/`:

```bash
npm run dev
npm start
```

Both packages also expose targeted `verify:*` scripts for implemented flows such as authentication, onboarding, profile photos, demo lifecycle, matching, GridFS, account deletion, PayPal subscriptions/webhooks, and the matches map. Some backend verification scripts require configured external services or a test MongoDB connection; review the script and environment before running it.

## API and Postman

The Express API is grouped under `/api/auth`, `/api/users`, `/api/file`, `/api/swipes`, `/api/matches`, `/api/conversations`, `/api/blocks`, and `/api/subscriptions`.

The `postman/` directory contains a Postman Collection v2.1, a safe local environment template, and import/run instructions. Use disposable local accounts, run Register and Login first, and never place real tokens or provider secrets in exported Postman files.
