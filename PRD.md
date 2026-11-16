# Product Requirements Document (PRD)
## SimpleChat — Firebase Real-Time Chat Prototype

**Version:** 2.0 (Simplified)  
**Status:** Development Planning  
**Type:** Web Application Prototype  
**Architecture:** Hybrid Frontend + Backend  
**Database:** Cloud Firestore  
**Authentication:** Firebase Authentication (Google Sign-In)

---

## 1. Project Overview

### 1.1 Deskripsi

SimpleChat merupakan aplikasi web sederhana untuk berkomunikasi melalui pesan teks secara real-time.

Aplikasi mendukung dua jenis percakapan:

1. **Private Chat:** Percakapan antara dua pengguna.
2. **Group Chat:** Percakapan antara tiga pengguna atau lebih.

Pengguna masuk menggunakan akun Google melalui Firebase Authentication. Setelah login, pengguna dapat melihat pengguna lain, membuat percakapan, dan saling berkirim pesan.

Cloud Firestore digunakan untuk menyimpan data pengguna, percakapan, dan pesan.

Frontend menggunakan Firebase Web SDK untuk mengakses data secara langsung dan menerima perubahan real-time.

Backend Express menggunakan Firebase Admin SDK untuk membuat percakapan dan mengirim pesan.

### 1.2 Tujuan Project

- Memahami Firebase Authentication dengan Google Sign-In.
- Memahami penggunaan Cloud Firestore.
- Mempelajari perbedaan Firebase Web SDK dan Admin SDK.
- Mengimplementasikan pembagian tugas frontend dan backend.
- Membuat private chat dan group chat.
- Mengimplementasikan real-time messaging menggunakan `onSnapshot()`.
- Memahami Firestore Security Rules.

### 1.3 Batasan Project

Prototype hanya menyediakan fitur dasar chatting.

Tidak diperlukan:

- Approved users / whitelist.
- Role admin.
- Online/offline status.
- Read receipts.
- Typing indicator.
- File attachment.
- Push notification.
- Edit atau hapus pesan.
- Invite link.
- Pengaturan admin grup.
- Manajemen anggota grup setelah grup dibuat.
- Pencegahan chat duplikat yang kompleks.
- Database tambahan.
- Firebase Emulator.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js + TypeScript |
| Styling | Tailwind CSS |
| Backend | Node.js + Express (JavaScript) |
| Authentication | Firebase Authentication |
| Login Provider | Google |
| Database | Cloud Firestore |
| Frontend SDK | Firebase Web SDK |
| Backend SDK | Firebase Admin SDK |
| Real-time | Firestore `onSnapshot()` |
| API | REST |

Frontend dan backend menggunakan Firebase Project yang sama.

Backend berjalan lokal pada port `3001`, sedangkan frontend menggunakan port `3000`.

---

## 3. System Architecture

```text
                    USER
                     |
                     v
               NEXT.JS FRONTEND
                     |
             GOOGLE SIGN-IN
                     |
                     v
             FIREBASE AUTH
                     |
                  Login
                     |
                     v
               CHAT DASHBOARD
                     |
          +----------+-----------+
          |                      |
          v                      v
    FIREBASE WEB SDK        EXPRESS BACKEND
          |                      |
       Read Data              REST API
       onSnapshot()              |
          |                Firebase Admin SDK
          |                      |
          v                      v
    FIRESTORE RULES         Backend Validation
          |                      |
          +----------+-----------+
                     |
                     v
               CLOUD FIRESTORE
                     |
                     v
              REAL-TIME UPDATE
```

### 3.1 Frontend Responsibilities

Frontend bertanggung jawab untuk:

- Google Sign-In dan Logout.
- Menampilkan profil pengguna.
- Membuat dokumen profil sendiri saat login pertama.
- Menampilkan daftar pengguna.
- Menampilkan daftar private chat dan group chat.
- Menampilkan riwayat pesan.
- Menjalankan Firestore real-time listener.
- Mengirim request create chat ke backend.
- Mengirim request send message ke backend.

### 3.2 Backend Responsibilities

Backend bertanggung jawab untuk:

- Memverifikasi Firebase ID Token.
- Membuat private chat.
- Membuat group chat.
- Memastikan pengirim merupakan anggota chat.
- Menolak pesan kosong.
- Menyimpan pesan menggunakan Firebase Admin SDK.

Backend tidak perlu menyediakan API untuk membaca daftar pengguna, daftar chat, atau pesan karena semuanya ditangani Firebase Web SDK.

### 3.3 Firestore Responsibilities

Firestore bertanggung jawab untuk:

- Menyimpan data pengguna.
- Menyimpan private chat dan group chat.
- Menyimpan pesan.
- Menyediakan real-time listener.
- Membatasi akses menggunakan Firestore Security Rules.

---

## 4. Database Design

Gunakan hanya dua collection utama:

- `users`
- `chats`

Collection `chats` memiliki subcollection `messages`.

### 4.1 Struktur Firestore

```text
firestore/
│
├── users/
│   ├── uid_dzikri
│   │   └── name: "Dzikri"
│   │
│   ├── uid_budi
│   │   └── name: "Budi"
│   │
│   └── uid_andi
│       └── name: "Andi"
│
└── chats/
    │
    ├── chat_001
    │   ├── type: "direct"
    │   ├── memberIds:
    │   │   ["uid_dzikri", "uid_budi"]
    │   │
    │   └── messages/
    │       ├── message_001
    │       │   ├── senderId: "uid_dzikri"
    │       │   ├── text: "Halo Budi"
    │       │   └── createdAt: Timestamp
    │       │
    │       └── message_002
    │           ├── senderId: "uid_budi"
    │           ├── text: "Halo juga"
    │           └── createdAt: Timestamp
    │
    └── chat_002
        ├── type: "group"
        ├── name: "Grup Belajar"
        ├── memberIds:
        │   ["uid_dzikri", "uid_budi", "uid_andi"]
        │
        └── messages/
            └── ...
```

### 4.2 Collection `users`

| Field | Type | Description |
|---|---|---|
| Document ID | string | Firebase Auth UID |
| `name` | string | Nama pengguna |

Dokumen dibuat ketika pengguna pertama kali login.

Gunakan `displayName` yang diperoleh dari Google Sign-In sebagai nama awal. Jika tidak tersedia, gunakan nama default sederhana.

Tidak perlu menyimpan email, foto profil, timestamp, atau role pada collection ini.

### 4.3 Collection `chats`

| Field | Type | Description |
|---|---|---|
| Document ID | string | Auto-generated Firestore ID |
| `type` | string | `direct` atau `group` |
| `name` | string | Nama grup, hanya untuk group chat |
| `memberIds` | string[] | Daftar UID anggota chat |

Untuk private chat:

```json
{
  "type": "direct",
  "memberIds": ["uid_dzikri", "uid_budi"]
}
```

Untuk group chat:

```json
{
  "type": "group",
  "name": "Grup Belajar",
  "memberIds": [
    "uid_dzikri",
    "uid_budi",
    "uid_andi"
  ]
}
```

Private chat tidak membutuhkan field `name`. Frontend menampilkan nama lawan bicara berdasarkan collection `users`.

Untuk prototype, tidak perlu membuat ID room deterministik atau mekanisme deduplikasi. Jika pengguna membuat percakapan yang sama dua kali, dua room boleh terbentuk.

### 4.4 Subcollection `messages`

Path:

`chats/{chatId}/messages/{messageId}`

| Field | Type | Description |
|---|---|---|
| Document ID | string | Auto-generated ID |
| `senderId` | string | UID pengirim |
| `text` | string | Isi pesan |
| `createdAt` | Timestamp | Waktu pengiriman |

Field `createdAt` tetap digunakan karena **dibutuhkan untuk mengurutkan pesan secara kronologis**.

Field `updatedAt`, `lastMessage`, `readStatus`, dan metadata lainnya tidak diperlukan.

---

## 5. Authentication

### 5.1 Google Sign-In

Autentikasi langsung menggunakan Firebase Authentication melalui frontend.

Gunakan:

- `GoogleAuthProvider`
- `signInWithPopup()`
- `onAuthStateChanged()`
- `signOut()`

### 5.2 Login Flow

```text
Open SimpleChat
       |
       v
Check Firebase Auth Session
       |
   +---+---+
   |       |
 Logged  Not Logged
   |       |
   |    Google Sign-In
   |       |
   +---+---+
       |
       v
 Firebase User UID
       |
       v
 Create Profile if Missing
       |
       v
 Chat Dashboard
```

Jika sudah login sebelumnya, pengguna langsung masuk ke halaman chat selama sesi Firebase masih valid.

Tidak diperlukan:

- Registrasi manual.
- Password aplikasi.
- Email verification khusus di backend.
- Approved users.
- Session management buatan sendiri.

Semua akun Google yang berhasil diautentikasi oleh Firebase boleh menggunakan prototype.

---

## 6. Application Features

### 6.1 Google Login

Pengguna dapat login menggunakan akun Google.

Setelah login, aplikasi menampilkan halaman chat.

### 6.2 User Directory

Menampilkan pengguna yang pernah login dan memiliki profil di Firestore.

Informasi yang ditampilkan hanya nama pengguna.

Pengguna dapat memilih orang lain untuk memulai private chat.

### 6.3 Private Chat

Pengguna memilih satu orang dari user directory, kemudian mengklik tombol Start Chat.

Frontend mengirim request ke backend untuk membuat room baru dengan `type: "direct"`.

Setelah room berhasil dibuat, pengguna masuk ke percakapan tersebut.

### 6.4 Group Chat

Pengguna dapat membuat grup menggunakan tombol Create Group.

Form group berisi:

- Group Name.
- Daftar pengguna yang akan dimasukkan.
- Tombol Create Group.

Pembuat grup otomatis menjadi anggota.

Minimal grup berisi tiga pengguna, termasuk pembuat grup.

Setelah dibuat, seluruh anggota dapat membuka dan mengirim pesan ke grup.

Untuk MVP, keanggotaan dan nama grup tidak dapat diubah setelah pembuatan.

### 6.5 Send Message

Pengguna mengetik pesan, kemudian menekan Enter atau tombol Send.

Frontend mengirim request ke backend Express.

Backend menyimpan pesan ke subcollection `messages`.

Pesan yang berhasil tersimpan akan diterima listener Firestore.

### 6.6 Real-Time Message

Frontend menggunakan `onSnapshot()` untuk mendengarkan perubahan pada pesan.

Setiap pesan baru akan muncul otomatis tanpa refresh.

Listener hanya aktif pada room yang sedang dibuka.

### 6.7 Chat History

Ketika pengguna membuka percakapan, aplikasi mengambil pesan yang telah disimpan.

Urutkan pesan berdasarkan `createdAt`.

Untuk prototype, tampilkan maksimal 50 pesan terbaru pada satu percakapan. Pagination riwayat lama belum diperlukan.

### 6.8 Chat List

Sidebar menampilkan semua private chat dan group chat yang diikuti pengguna.

Untuk menyederhanakan model database, daftar chat tidak perlu diurutkan berdasarkan pesan terakhir.

---

## 7. Backend API

Backend menggunakan JavaScript biasa dengan Express.

### 7.1 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Memeriksa backend |
| POST | `/api/chats` | Membuat private chat atau group chat |
| POST | `/api/chats/:chatId/messages` | Mengirim pesan |

Tidak diperlukan API user management, get messages, get chats, atau custom login.

### 7.2 Authentication Middleware

Setiap request POST harus membawa Firebase ID Token:

```http
Authorization: Bearer <firebase_id_token>
```

Backend menggunakan `verifyIdToken()` dari Firebase Admin SDK.

UID hasil verifikasi digunakan sebagai identitas pengirim.

Tidak perlu implementasi JWT login sendiri.

### 7.3 Create Private Chat

**Endpoint**

`POST /api/chats`

**Request**

```json
{
  "type": "direct",
  "recipientId": "uid_budi"
}
```

Backend menambahkan UID pengguna yang sedang login sebagai anggota room.

**Response**

```json
{
  "chatId": "chat_001"
}
```

### 7.4 Create Group Chat

**Endpoint**

`POST /api/chats`

**Request**

```json
{
  "type": "group",
  "name": "Grup Belajar",
  "memberIds": [
    "uid_budi",
    "uid_andi"
  ]
}
```

Backend secara otomatis memasukkan UID pembuat grup.

**Response**

```json
{
  "chatId": "chat_002"
}
```

### 7.5 Send Message

**Endpoint**

`POST /api/chats/:chatId/messages`

**Request**

```json
{
  "text": "Halo semuanya"
}
```

Backend:

1. Memverifikasi Firebase ID Token.
2. Memastikan pengirim anggota chat.
3. Memastikan pesan tidak kosong.
4. Menyimpan pesan ke Firestore.

**Response**

```json
{
  "success": true,
  "messageId": "message_001"
}
```

Tidak diperlukan queue, retry worker, transaction kompleks, atau middleware tambahan di luar kebutuhan dasar tersebut.

---

## 8. Firestore Security

Aplikasi tetap menggunakan Firestore Security Rules karena database berada di Firebase Cloud dan diakses langsung dari browser.

### 8.1 Access Rules

| Collection | Read | Write |
|---|---|---|
| `users` | Semua pengguna login | Pengguna hanya boleh membuat/mengubah profil sendiri |
| `chats` | Anggota chat | Backend |
| `messages` | Anggota chat | Backend |

### 8.2 Contoh Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() {
      return request.auth != null;
    }

    match /users/{userId} {

      allow read: if signedIn();

      allow create, update: if signedIn()
        && request.auth.uid == userId
        && request.resource.data.keys()
          .hasOnly(['name'])
        && request.resource.data.name is string
        && request.resource.data.name.size() > 0
        && request.resource.data.name.size() <= 100;

      allow delete: if false;
    }

    match /chats/{chatId} {

      allow read: if signedIn()
        && request.auth.uid
          in resource.data.memberIds;

      allow write: if false;

      match /messages/{messageId} {

        allow read: if signedIn()
          && request.auth.uid in get(
            /databases/$(database)/documents/chats/$(chatId)
          ).data.memberIds;

        allow write: if false;
      }
    }
  }
}
```

Frontend harus menggunakan `where("memberIds", "array-contains", uid)` untuk query daftar chat.

Backend Firebase Admin SDK melewati Security Rules, sehingga backend tetap wajib memeriksa UID dan keanggotaan chat sebelum menyimpan pesan.

### 8.3 Batas Keamanan

Tidak diperlukan sistem role, whitelist, atau permission bertingkat.

Namun, frontend tidak boleh menyimpan service account Firebase Admin SDK.

Gunakan kredensial server hanya di backend melalui Application Default Credentials atau konfigurasi service account yang aman.

---

## 9. Frontend UI/UX

### 9.1 Login Page

Komponen:

- Nama SimpleChat.
- Tombol Continue with Google.
- Loading indicator.
- Error message jika login gagal.

### 9.2 Chat Dashboard

Layout dua kolom:

**Sidebar**

- Nama pengguna yang login.
- Daftar private chat.
- Daftar group chat.
- Tombol New Chat.
- Tombol Create Group.
- Logout.

**Chat Window**

- Nama pengguna atau nama grup.
- Daftar pesan.
- Message bubble.
- Timestamp pesan.
- Input pesan.
- Tombol Send.

### 9.3 Create Group Modal

Form:

- Group name.
- Pilih beberapa pengguna.
- Create Group.

### 9.4 UI States

- Loading saat login.
- Loading saat membuka chat.
- Empty state ketika tidak ada chat.
- Error jika request gagal.
- Disable tombol Send selama pengiriman sedang berlangsung.

---

## 10. Project Structure

```text
simplechat/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── chat/
│   │   │       └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageInput.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── CreateGroupModal.tsx
│   │   │
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useChats.ts
│   │   │   └── useMessages.ts
│   │   │
│   │   ├── lib/
│   │   │   └── firebase.ts
│   │   │
│   │   └── services/
│   │       └── chatApi.ts
│   │
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── firebase.js
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   ├── routes/
│   │   │   └── chats.js
│   │   └── server.js
│   │
│   └── package.json
│
├── firestore.rules
├── .gitignore
└── README.md
```

Frontend menggunakan TypeScript, sedangkan backend menggunakan JavaScript ES Modules.

Tidak diperlukan controller-service-repository architecture yang berlapis untuk backend prototype ini.

---

## 11. Firebase Configuration

### 11.1 Firebase Console

1. Buat Firebase Project.
2. Daftarkan Web App.
3. Aktifkan Authentication.
4. Aktifkan Google Sign-In.
5. Konfigurasikan Authorized Domains untuk pengembangan dan deployment.
6. Buat Cloud Firestore database.
7. Gunakan Production Mode.
8. Deploy Firestore Security Rules.

### 11.2 Frontend Environment

```dotenv
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 11.3 Backend Environment

```dotenv
PORT=3001
FIREBASE_PROJECT_ID=
FRONTEND_ORIGIN=http://localhost:3000
```

Backend menggunakan Firebase Admin SDK dengan kredensial server yang aman.

Untuk development lokal, gunakan Application Default Credentials atau service account yang disimpan di luar repository.

### 11.4 Firestore Index

Jika query chat membutuhkan composite index, buat berdasarkan pesan error yang diberikan Firestore.

Tidak perlu membuat banyak index sejak awal.

---

## 12. Development Phases

### Phase 1 — Setup

- Buat frontend Next.js.
- Buat backend Express.
- Siapkan Firebase Project.
- Aktifkan Google Sign-In.
- Buat Cloud Firestore.
- Hubungkan Firebase Web SDK dan Admin SDK.

**Output:** Frontend dan backend dapat terhubung ke Firebase Cloud.

### Phase 2 — Authentication & User Profile

- Implementasi Google Sign-In.
- Simpan nama pengguna ke Firestore saat login pertama.
- Implementasi logout.
- Tampilkan daftar pengguna.

**Output:** Dua akun Google dapat login dan melihat daftar pengguna.

### Phase 3 — Private Chat

- Membuat chat satu lawan satu.
- Menampilkan room.
- Mengirim pesan melalui backend.
- Mendengarkan pesan dengan `onSnapshot()`.

**Output:** Dua pengguna dapat bertukar pesan secara real-time.

### Phase 4 — Group Chat

- Form create group.
- Pilih anggota.
- Buat room tipe group.
- Menampilkan group chat.
- Mengirim dan menerima pesan grup.

**Output:** Tiga atau lebih pengguna dapat bertukar pesan dalam satu grup.

### Phase 5 — Testing & Finalisasi

- Uji login/logout.
- Uji private chat.
- Uji group chat.
- Uji real-time.
- Uji akses room yang bukan milik pengguna.
- Uji refresh halaman.
- Uji error dasar.
- Production build.

**Output:** Prototype chat berfungsi dan siap didemonstrasikan.

---

## 13. Testing Requirements

| Test Case | Expected Result |
|---|---|
| Login Google | Login berhasil |
| Login pertama | Profil dibuat |
| Login berikutnya | Profil yang sama digunakan |
| Membuat private chat | Room berhasil dibuat |
| Membuat group chat | Room berhasil dibuat |
| Memilih anggota grup | Anggota tersimpan |
| Mengirim pesan | Pesan tersimpan |
| Pesan masuk dari pengguna lain | Muncul real-time |
| Refresh browser | Riwayat tetap tersedia |
| Mengirim pesan kosong | Ditolak |
| Pengguna bukan anggota membaca room | Ditolak |
| Pengguna bukan anggota mengirim pesan | Ditolak |
| Pengguna belum login membaca chat | Ditolak |
| Logout | Sesi berakhir |

---

## 14. Acceptance Criteria

Prototype dianggap selesai jika:

1. Google Sign-In berhasil.
2. Profil pengguna otomatis dibuat setelah login pertama.
3. Pengguna dapat melihat pengguna lainnya.
4. Private chat dapat dibuat.
5. Group chat dapat dibuat.
6. Pengguna dapat mengirim pesan melalui Express API.
7. Pesan muncul real-time menggunakan Firestore Web SDK.
8. Riwayat pesan tetap tersimpan di Firestore.
9. Pengguna hanya dapat membaca chat yang diikutinya.
10. Frontend dan backend menggunakan Firebase Cloud yang sama.
11. Tidak ada Firebase Emulator.
12. Backend menggunakan JavaScript biasa, bukan TypeScript.

---

## 15. Official References

- https://firebase.google.com/docs/web/setup
- https://firebase.google.com/docs/auth/web/google-signin
- https://firebase.google.com/docs/firestore/data-model
- https://firebase.google.com/docs/firestore/client/libraries
- https://firebase.google.com/docs/firestore/query-data/listen
- https://firebase.google.com/docs/firestore/security/get-started
- https://firebase.google.com/docs/admin/setup
- https://firebase.google.com/docs/auth/admin/verify-id-tokens

---

## 16. Final Architecture Decision

SimpleChat menggunakan arsitektur hybrid sederhana.

**Frontend (Next.js + TypeScript)**

- Google Sign-In.
- Read Firestore.
- Real-time listener.
- Chat UI.
- API request ke backend.

**Backend (Express + JavaScript)**

- Verifikasi Firebase ID Token.
- Create private/group chat.
- Send message.
- Validasi keanggotaan chat.

**Database (Cloud Firestore)**

- Users.
- Chats.
- Messages.

Tidak diperlukan sistem administrasi pengguna, role management, approved users, database tambahan, maupun logic production yang kompleks.

Fokus project adalah memahami integrasi frontend–backend dengan Firebase Authentication, Firebase Web SDK, Firebase Admin SDK, serta Cloud Firestore untuk komunikasi real-time.