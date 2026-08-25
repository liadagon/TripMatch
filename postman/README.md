# TripMatch Postman collection

1. In Postman, import `TripMatch.postman_collection.json`.
2. Import `TripMatch.local.postman_environment.json` and select **TripMatch Local**.
3. Configure the backend's local environment, then run it with `cd server` and `npm start` (or `npm run dev`). The template expects `http://127.0.0.1:5000/api`.
4. Use disposable test credentials only. Run **Register Disposable User**, then **Login and Save JWT**; login automatically saves `token` for Bearer-authenticated requests.
5. Complete onboarding for relationship routes. Populate `otherUserId` with the MongoDB ObjectId of a second disposable user who is matched with the first account. Conversation requests can obtain `conversationId` from **Get Matched Profile**, **List Conversations**, or **Get Conversation With Matched User**.

Recommended safe order: Auth, profile update/reads, swipes, matches, conversations, then **Block Matched User** immediately followed by **Unblock Matched User**. Run the error cases independently. Do not use this collection with production data, real accounts, or real credentials.
