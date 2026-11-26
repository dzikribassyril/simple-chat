# SimpleChat Backend - Firebase Setup Guide

## 📌 Prerequisites
1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Service account JSON file for `explore-rnd-2` project
3. Node.js environment

## 🔧 Setup Steps

### 1. Make Firebase CLI use correct project
```bash
firebase use explore-rnd-2
```

### 2. Create Firestore Database
Go to [Firebase Console](https://console.firebase.google.com/) → Project `explore-rnd-2` → **Databases & Storage** → **Firestore** → **Create Database**
- Location: `us-central1` (or any available region)
- Mode: **Test mode** (for development)

### 3. Seed Initial Data
```bash
cd simplechat-be
node scripts/seed-firestore.mjs
```

### 4. Verify Data
Check in Firebase Console → Firestore → Data to see:
- 4 users (Dzikri, Sarah, Reza, Maya)
- 2 direct chats with 5+ messages each
- 1 group chat with 5 messages

### 5. Start Server
```bash
npm run dev
```

## 📂 Project Structure
```
simplechat-be/
├── src/
│   ├── adapters/
│   │   ├── firebase.js        # Firebase Firestore adapter
│   │   └── appwrite.js        # Appwrite adapter (optional)
│   ├── routes/
│   │   ├── chats.js
│   │   └── profile.js
│   └── server.js              # Express server
└── scripts/
    └── seed-firestore.mjs     # Seeding script
```

## 🔐 Environment Variables (.env)
```
PORT=3001
FRONTEND_ORIGIN=http://localhost:3000
BACKEND_PROVIDER=appwrite
FIREBASE_PROJECT_ID=explore-firestore-rnd
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\Asani\.config\simplechat\service-account.json
```

## 🧪 Testing
To test authentication:
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```