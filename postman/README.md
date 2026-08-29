# TripMatch Postman collection

Import `TripMatch.postman_collection.json`, then select one environment:

- `TripMatch.local.postman_environment.json` uses `http://127.0.0.1:5000`.
- `TripMatch.production.postman_environment.json` uses the deployed Render backend and Vercel frontend. It is a non-secret template; fill runtime values in Postman and do not export them afterward.

The collection appends `/api` to `baseUrl`. For local use, configure the backend environment and run `cd server` followed by `npm start` or `npm run dev`.

## Safe setup order

1. Use disposable test credentials only. Run **Register Disposable User**, then **Login and Save JWT**. Login saves `token` and `userId`.
2. Complete onboarding before relationship and subscription routes. Set `otherUserId` to a real disposable matched user's MongoDB ObjectId. Conversation requests can discover and save `conversationId`.
3. For Google authentication, obtain a fresh Firebase ID token through the real Google flow and enter it as `firebaseIdToken`. Never save or export that token.
4. For email OTP, use a disposable inbox, run **Request Email OTP** once, enter the received six-digit `otpCode`, and run **Verify Email OTP** before it expires.
5. For GridFS upload, select a disposable JPEG, PNG, WebP, or GIF no larger than 5MB. Postman may require selecting the file manually even when `uploadFilePath` is set.
6. PayPal subscription requests require a fully onboarded disposable user and correctly configured PayPal Sandbox server settings. Creation is skipped unless `allowPayPalMutations=true`.

## Destructive-request protection

`allowDestructiveRequests` defaults to `false`. Conversation clearing, account deletion, and PayPal cancellation call `pm.execution.skipRequest()` unless it is explicitly changed to `true`. Enable it only while manually testing disposable conversation data, an account, or a Sandbox subscription, then immediately restore it to `false`. Do not run the complete collection against real production accounts.

The webhook request is intentionally unsigned. A configured server should reject it with 401; a server missing `PAYPAL_WEBHOOK_ID` may return 503. Successful verification can only be tested using PayPal-generated `paypal-auth-algo`, `paypal-cert-url`, `paypal-transmission-id`, `paypal-transmission-sig`, and `paypal-transmission-time` headers from a Sandbox webhook delivery or simulator. No PayPal secret belongs in Postman.

Recommended non-destructive demonstration order: System health, Auth, profile reads/updates, files, swipes, matches, conversations, subscription status, and error cases. Run reversible block/unblock requests together. Run mutation and deletion requests individually with disposable data.
