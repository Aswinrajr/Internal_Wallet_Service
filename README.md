# 🦖 DinoWallet - Internal Ledger Service

A robust, closed-loop wallet system built for high-performance internal transactions. It features a premium, animated frontend dashboard and a secure Node.js/MongoDB backend.

## ✨ Key Features

### 🎨 Modern Frontend

- **Premium UI**: Sleek dark mode design with glassmorphism effects.
- **Live Animations**: `framer-motion` for smooth transitions and `canvas-confetti` for celebratory effects on top-ups.
- **Interactive Dashboard**: Real-time balance updates and transaction history.
- **User Management**: create new users instantly with the "+" button.

### 🛠️ Developer Tools

- **Integrated API Playground**: Test backend endpoints directly from the UI (toggle via the `< >` / `Terminal` button).
- **Response Viewer**: View raw JSON responses, status codes, and error messages for debugging.

### 🔐 Robust Backend

- **ACID Transactions**: Uses MongoDB sessions to ensure data integrity during multi-document updates.
- **Idempotency**: Prevents double-spending by tracking unique keys for every transaction.
- **Optimistic Concurrency**: Handles high-load scenarios safely.

## 🚀 Technology Stack

- **Frontend**: React, Tailwind CSS, Framer Motion, Lucide React
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose)

## 🛠️ Setup & Running

### Prerequisites

- Node.js (v18+)
- MongoDB (running locally on default port 27017)

### 1. Database Setup

First, ensure MongoDB is running. Then seed the database with initial users (`alice`, `bob`) and assets (`Gold Coins`, `Reward Points`).

```bash
cd server
npm install
npm run seed
```

### 2. Start Backend

Runs on `http://localhost:3000`.

```bash
cd server
npm run dev
```

### 3. Start Frontend

Runs on `http://localhost:5173`.

```bash
cd client
npm install
npm run dev
```

## 📚 API Documentation

### Users & Assets

| Method | Endpoint      | Description                                        |
| :----- | :------------ | :------------------------------------------------- |
| `GET`  | `/api/users`  | List all users                                     |
| `POST` | `/api/users`  | Create a new user (Body: `{ "username": "name" }`) |
| `GET`  | `/api/assets` | List supported asset types                         |

### Wallet Operations

| Method | Endpoint                    | Description                     |
| :----- | :-------------------------- | :------------------------------ |
| `GET`  | `/api/wallet/:userId`       | Get user bounds                 |
| `GET`  | `/api/transactions/:userId` | Get transaction history         |
| `POST` | `/api/wallet/topup`         | Credit funds (External deposit) |
| `POST` | `/api/wallet/bonus`         | Credit funds (System reward)    |
| `POST` | `/api/wallet/spend`         | Debit funds (Purchase)          |

### Transaction Payload Example

All wallet `POST` requests accept the following JSON body:

```json
{
  "userId": "alice",
  "assetType": "Gold Coins",
  "amount": 50.0,
  "idempotencyKey": "unique-uuid-v4",
  "description": "Weekly log-in bonus"
}
```

## 🧪 Testing with API Playground

1.  Open the Dashboard at `http://localhost:5173`.
2.  Click the **"Test API"** button (Terminal Icon) at the top right of the transaction card.
3.  Select `POST` method.
4.  Enter endpoint: `/api/wallet/bonus`.
5.  Modify the JSON body as needed.
6.  Click **Send Request** to see the live backend response!



