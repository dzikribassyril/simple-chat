# simplechat-fe

The SimpleChat frontend. Next.js 16 with TypeScript and Tailwind CSS 4.

The frontend uses the Firebase Web SDK to sign in, read the `users` and `chats` collections,
and listen for messages in real time with `onSnapshot()`. Every write is sent to the Express
backend through the REST API.

## Running

```bash
npm install
cp .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3000`. The backend must run on `http://localhost:3001` for
the send and create buttons to work.

## Environment

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth domain, usually `<project-id>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Web app ID |
| `NEXT_PUBLIC_API_URL` | Backend address, defaults to `http://localhost:3001` |

`NEXT_PUBLIC_` values are inlined at build time, so `.env.local` must exist before
`npm run build`.

## Structure

```text
app/
├── page.tsx            # Redirects to /chat or /login
├── login/page.tsx      # Google sign-in page
└── chat/page.tsx       # Room dashboard
components/
├── ChatList.tsx        # Direct chats and groups
├── ChatWindow.tsx      # Room header, message list, composer
├── MessageBubble.tsx   # One message
├── MessageInput.tsx    # Text field and send button
├── CreateGroupModal.tsx
├── StartChatModal.tsx
├── UserPicker.tsx      # User list shared by both modals
└── Modal.tsx           # Native dialog with Escape support
hooks/
├── useAuth.ts
├── useChats.ts
├── useMessages.ts
└── useUsers.ts
lib/
├── firebase.ts         # Web SDK setup
├── chats.ts            # Firestore listeners for chats and messages
├── users.ts            # User profile and user directory
├── types.ts
└── format.ts
services/
└── chatApi.ts          # REST calls to the backend
```

## Behaviour notes

- The open room is kept in the `?room=<chatId>` query parameter, so a browser refresh opens
  the same room. Switching rooms uses `window.history.pushState` so no request goes to the
  server.
- The message listener only runs for the open room and keeps the 50 newest messages.
- The profile document in the `users` collection is written on the first sign-in and holds
  only a `name` field, as required by the Security Rules.
- On narrow screens the sidebar is hidden while a room is open, and the Back button returns
  to the conversation list.
