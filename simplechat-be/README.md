# simplechat-be

The SimpleChat backend. Express for Firebase.

The backend only writes to Firestore: it creates conversations and stores messages. It uses
the Firebase Admin SDK, so it bypasses Security Rules and must verify the ID token and the
chat membership on its own.

Written in plain JavaScript with ES Modules (`"type": "module"`), as required by PRD
section 14.

## Running

```bash
npm install
cp .env.example .env
npm run dev
```

The server runs on `http://localhost:3001`.

## Environment

| Variable | Value |
|---|---|
| `PORT` | Backend port, defaults to `3001` |
| `FRONTEND_ORIGIN` | Origin allowed by CORS, defaults to `http://localhost:3000` |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to the service account JSON file |

`GOOGLE_APPLICATION_CREDENTIALS` is optional when the backend runs on Google Cloud with
Application Default Credentials. Never commit the service account file.

## Endpoints

Every POST endpoint expects the header `Authorization: Bearer <firebase id token>`. The
token is fetched in the browser with `user.getIdToken()`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Backend health check |
| `POST` | `/api/chats` | Create a direct chat or a group |
| `POST` | `/api/chats/:chatId/messages` | Send a message |

### `POST /api/chats`

Direct chat:

```json
{ "type": "direct", "recipientId": "uid_budi" }
```

Group chat:

```json
{ "type": "group", "name": "Study group", "memberIds": ["uid_budi", "uid_andi"] }
```

Response: `{ "chatId": "chat_001" }`.

The backend adds the creator UID automatically, rejects a group with fewer than three
members, and rejects members whose profile does not exist in the `users` collection.

### `POST /api/chats/:chatId/messages`

```json
{ "text": "Hello everyone" }
```

Response: `{ "success": true, "messageId": "message_001" }`.

The backend rejects an empty message, a message that is too long, and a sender who is not a
member of the conversation.
