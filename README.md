# TripMatch

## Live Demo

- Frontend: [https://tripmatch-pi.vercel.app](https://tripmatch-pi.vercel.app)
- Backend: [https://tripmatch-backend.onrender.com](https://tripmatch-backend.onrender.com)

## Repository

- GitHub: [https://github.com/liadagon/TripMatch](https://github.com/liadagon/TripMatch)

## Demo Video

- [TripMatch project walkthrough](https://drive.google.com/file/d/13AWF8nRKSsU76TJ8K9a5wOW0hvl1yXUU/view?usp=sharing)

## Project Overview

TripMatch is a full-stack, end-to-end web application for people looking for compatible travel partners. It helps users move from creating a travel profile to discovering people with similar plans, expressing interest, forming reciprocal matches, and chatting with those matches.

The core journey is: authenticate, complete onboarding and travel preferences, browse Discover, like or skip profiles, review received likes and matches, then use chat and the matches map. The repository contains a React client, an Express API, MongoDB persistence, GridFS media storage, and optional third-party integrations. The application supports local development and is deployed with Vercel, Render, and MongoDB Atlas.

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

## Screenshots / Demo

### Demo Video

[https://drive.google.com/file/d/13AWF8nRKSsU76TJ8K9a5wOW0hvl1yXUU/view?usp=sharing](https://drive.google.com/file/d/13AWF8nRKSsU76TJ8K9a5wOW0hvl1yXUU/view?usp=sharing)

This video provides a walkthrough of the final TripMatch application and its core user experience.

## Team

- Project type: Solo project
- Role: Full-stack development

## Deployment

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- Frontend URL: [https://tripmatch-pi.vercel.app](https://tripmatch-pi.vercel.app)
- Backend URL: [https://tripmatch-backend.onrender.com](https://tripmatch-backend.onrender.com)

## Prerequisites

- Node.js and npm
- A reachable MongoDB instance
- Optional provider accounts only for the features you intend to exercise: Firebase/Google, Brevo email OTP, Geoapify maps, or PayPal sandbox Boost

## Clone

```bash
git clone https://github.com/liadagon/TripMatch.git
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

The Express API is grouped under `/api/auth`, `/api/users`, `/api/file`, `/api/swipes`, `/api/matches`, `/api/conversations`, `/api/blocks`, and `/api/subscriptions`. The following representative endpoints cover the main application flow and demonstrate GET, POST, PUT, and DELETE operations.

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | No | Register a local account and return its JWT session payload. |
| POST | `/api/auth/login` | No | Authenticate a local account and return its JWT session payload. |
| GET | `/api/auth/me` | Bearer JWT | Return the normalized current-user identity and registration state. |
| PUT | `/api/users/me` | Bearer JWT | Update allowed fields on the authenticated user's profile. |
| GET | `/api/users` | Bearer JWT + onboarding | List ranked discovery profiles with filters and pagination. |
| GET | `/api/users/me/stats` | Bearer JWT + onboarding | Return the current user's like, match, and conversation statistics. |
| GET | `/api/users/:id` | Bearer JWT + onboarding | Return one public user profile. |
| POST | `/api/swipes` | Bearer JWT + onboarding | Persist a `like` or `skip` and create a reciprocal match when applicable. |
| GET | `/api/swipes` | Bearer JWT + onboarding | List swipe decisions made by the current user. |
| GET | `/api/swipes/received` | Bearer JWT + onboarding | Return received-like visibility and records according to entitlement. |
| GET | `/api/matches` | Bearer JWT + onboarding | List the current user's active, unblocked matches. |
| GET | `/api/matches/map` | Bearer JWT + onboarding | Return privacy-safe trip-location data for the matches map. |
| GET | `/api/matches/with/:userId/profile` | Bearer JWT + onboarding | Return the expanded profile and conversation ID for an existing match. |
| GET | `/api/conversations` | Bearer JWT + onboarding | List visible conversations for the current user. |
| GET | `/api/conversations/with/:userId` | Bearer JWT + onboarding | Get or establish the conversation for an existing match. |
| GET | `/api/conversations/:conversationId/messages` | Bearer JWT + onboarding | Return visible messages from an authorized conversation. |
| POST | `/api/conversations/:conversationId/messages` | Bearer JWT + onboarding | Add a text message to an authorized, unblocked conversation. |
| DELETE | `/api/conversations/:conversationId` | Bearer JWT + onboarding | Clear existing conversation history for the current user only. |
| GET | `/api/blocks` | Bearer JWT + onboarding | List users blocked by the current user. |
| POST | `/api/blocks/:userId` | Bearer JWT + onboarding | Block an existing matched user. |
| DELETE | `/api/blocks/:userId` | Bearer JWT + onboarding | Remove the current user's block for a matched user. |
| POST | `/api/file` | Bearer JWT | Upload one validated profile image as multipart field `file`. |
| GET | `/api/file/:fileId` | No | Stream a profile image from GridFS by its validated identifier. |

## API Examples

The response samples below are abbreviated for documentation clarity. Placeholder identifiers and tokens are not real account data.

### 1. Register a local account

`POST /api/auth/register`

Request body:

```json
{
  "name": "Example Traveler",
  "email": "user@example.com",
  "password": "Disposable-Example-123!"
}
```

Representative `201 Created` response:

```json
{
  "success": true,
  "message": "Registration started successfully",
  "token": "<JWT_TOKEN>",
  "data": {
    "_id": "<USER_ID>",
    "name": "Example Traveler",
    "email": "user@example.com",
    "authProvider": "local",
    "registrationComplete": false,
    "registrationInProgress": true,
    "nextRegistrationStep": "photos",
    "onboardingComplete": false,
    "nextOnboardingStep": "photos"
  },
  "authenticated": true,
  "registrationComplete": false,
  "registrationInProgress": true,
  "nextRegistrationStep": "photos",
  "accountState": "new_registration",
  "onboardingComplete": false,
  "nextOnboardingStep": "photos"
}
```

### 2. Restore the authenticated identity

`GET /api/auth/me`

Request metadata:

```json
{
  "headers": {
    "Authorization": "Bearer <JWT_TOKEN>"
  }
}
```

Representative `200 OK` response for a completed profile:

```json
{
  "success": true,
  "data": {
    "_id": "<USER_ID>",
    "name": "Example Traveler",
    "email": "user@example.com",
    "authProvider": "local",
    "registrationComplete": true,
    "registrationInProgress": false,
    "nextRegistrationStep": null,
    "onboardingComplete": true,
    "nextOnboardingStep": null
  },
  "authenticated": true,
  "registrationComplete": true,
  "registrationInProgress": false,
  "nextRegistrationStep": null,
  "accountState": "registered",
  "onboardingComplete": true,
  "nextOnboardingStep": null
}
```

### 3. Update the current profile

`PUT /api/users/me`

Request metadata and body:

```json
{
  "headers": {
    "Authorization": "Bearer <JWT_TOKEN>"
  },
  "body": {
    "bio": "Planning a relaxed food and culture trip."
  }
}
```

Representative `200 OK` response:

```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    "_id": "<USER_ID>",
    "name": "Example Traveler",
    "email": "user@example.com",
    "bio": "Planning a relaxed food and culture trip.",
    "registrationComplete": true,
    "registrationInProgress": false,
    "nextRegistrationStep": null,
    "onboardingComplete": true,
    "nextOnboardingStep": null
  },
  "registrationComplete": true,
  "registrationInProgress": false,
  "nextRegistrationStep": null,
  "onboardingComplete": true,
  "nextOnboardingStep": null
}
```

The `postman/` directory contains a Postman Collection v2.1, the local `postman/TripMatch.local.postman_environment.json` environment, the `postman/TripMatch.production.postman_environment.json` production template, and import/run instructions. Use disposable accounts, run Register and Login first, and never place real tokens or provider secrets in exported Postman files.
