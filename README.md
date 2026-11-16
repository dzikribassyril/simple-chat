# SimpleChat

A real-time chat prototype built on Firebase Authentication, Cloud Firestore, and Express.
The frontend reads data directly through the Firebase Web SDK, the backend writes through
the Firebase Admin SDK.

The full specification lives in [PRD.md](./PRD.md).

## Structure

```text
simple-chat/
├── firestore.rules          # Security Rules deployed to Firebase
├── firebase.json            # Rules deploy configuration
├── .firebaserc              # Links this folder to the Firebase project
├── simplechat-fe/           # Frontend: Next.js + TypeScript
└── simplechat-be/           # Backend: Express + JavaScript ES Modules
```

Each folder carries its own git repository, so the frontend and the backend can be
developed and deployed separately.

## Technology

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 + TypeScript + Tailwind CSS 4 |
| Backend | Node.js + Express (JavaScript ES Modules) |
| Auth | Firebase Authentication, Google sign-in |
| Database | Cloud Firestore |
| Real-time | Firestore `onSnapshot()` |

## Firebase project

This project runs against the Firebase project `explore-firestore-rnd`.

- Web app config: `simplechat-fe/.env.local`
- Backend credentials: `simplechat-be/.env` (`GOOGLE_APPLICATION_CREDENTIALS`)
- Security Rules: `firestore.rules`

Google sign-in is already enabled and `localhost` is an authorized domain.

### Deploying the rules

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only firestore:rules
```

`firestore.rules` grants read access on `users` to every signed-in user, grants read access
on `chats` and `messages` to chat members only, and blocks every browser write. Writes go
through the backend only.

### Shared users collection

The `users` collection is also used by the user management app on the same Firebase
project, and those documents store `fullName` and `email` instead of `name`. Two rules keep
both apps working:

- The rules allow any Google-signed-in user to manage every profile, which is what the
  other app needs.
- The frontend reads `name` and falls back to `fullName`, so both kinds of profile show a
  readable name.

If the other app is retired, remove the `managesAllProfiles()` branch from `firestore.rules`
to lock every profile down to its owner and the `name` field only.

## Running the backend

```bash
cd simplechat-be
npm install
cp .env.example .env
npm run dev
```

The backend runs on `http://localhost:3001`. Fill in `FIREBASE_PROJECT_ID` and
`GOOGLE_APPLICATION_CREDENTIALS` in `.env`. The service account file stays outside the
repository.

## Running the frontend

```bash
cd simplechat-fe
npm install
cp .env.example .env.local
npm run dev
```

The frontend runs on `http://localhost:3000`. Make sure `NEXT_PUBLIC_API_URL` points at the
backend.

## Manual test plan

Two or three Google accounts are needed, ideally in two browsers or two separate profiles.

| Scenario | Expected result |
|---|---|
| Sign in with Google | The chat dashboard opens |
| First sign-in | A document is written to the `users` collection |
| New chat with one person | A `type: "direct"` room is created and opens |
| Create a group with two other members | A `type: "group"` room is created |
| Send a message | The message appears in both browsers without a refresh |
| Refresh the browser | The open room is kept through the `?room=` query parameter |
| Send an empty message | Rejected, an error message is shown |
| Open a room owned by another user | Rejected, the "Conversation unavailable" state is shown |
| Sign out | The session ends and the sign-in page returns |

## Notes

- A single conversation shows at most the 50 newest messages, with no pagination for older history.
- The conversation list is not sorted by the last message.
- `firestore.rules` uses `get()` to check chat membership, so every message read adds one
  extra document read on top of the usual cost.
- There is no Firebase Emulator; every operation runs against Firebase Cloud.
