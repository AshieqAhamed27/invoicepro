# InvoicePro 🧾

A full-stack SaaS invoicing app for freelancers. Built with React, Node.js, Express, and MongoDB.

---

## 🗂️ Project Structure

```
invoicepro/
├── backend/          # Node.js + Express API
│   ├── models/       # MongoDB models (User, Invoice)
│   ├── routes/       # Auth & Invoice REST routes
│   ├── middleware/   # JWT auth middleware
│   ├── server.js     # Main server entry point
│   └── .env.example  # Environment variable template
│
└── frontend/         # React + Vite + Tailwind CSS
    └── src/
        ├── pages/    # Login, Signup, Dashboard, CreateInvoice, InvoiceView
        ├── components/ # Navbar
        └── utils/    # API client (axios), auth helpers
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+ 
- MongoDB (local install OR free [MongoDB Atlas](https://www.mongodb.com/atlas))
- npm or yarn

---

### Step 1 — Set up the Backend

```bash
cd backend
npm install
```

Copy the environment file and edit it:
```bash
cp .env.example .env
```

Open `.env` and set your values:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/invoicepro
JWT_SECRET=pick_a_long_random_secret_string_here
```

> 💡 **Using MongoDB Atlas?** Replace MONGO_URI with your Atlas connection string, e.g.:
> `MONGO_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/invoicepro`

Start the backend:
```bash
npm run dev    # development (with auto-reload)
# or
npm start      # production
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:5000
```

---

### Step 2 — Set up the Frontend

Open a new terminal:
```bash
cd frontend
npm install
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 500ms
  ➜  Local: http://localhost:5173/
```

---

### Step 3 — Open the App

Visit **http://localhost:5173** in your browser.

1. Click **"Create one free"** to sign up
2. Start creating invoices from the Dashboard
3. View, download as PDF, or delete invoices

---

## ✨ Features

| Feature | Free Plan | Pro Plan |
|---------|-----------|----------|
| Create invoices | 2 max | Unlimited |
| PDF download | ✅ | ✅ |
| INR & USD currency | ✅ | ✅ |
| Invoice status tracking | ✅ | ✅ |
| Dashboard analytics | ✅ | ✅ |
| Price | Free | ₹99/month |

---

## 🔑 API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user (auth required) |
| PUT | `/api/auth/upgrade` | Upgrade to Pro (auth required) |

### Invoices (all require auth header: `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/invoices` | Get all user's invoices |
| GET | `/api/invoices/:id` | Get single invoice |
| POST | `/api/invoices` | Create new invoice |
| PUT | `/api/invoices/:id/status` | Update invoice status |
| DELETE | `/api/invoices/:id` | Delete invoice |

---

## 🚀 Deploying

### Backend (Render / Railway / Fly.io)
1. Push your code to GitHub
2. Create a new Web Service pointing to `/backend`
3. Set environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`
4. Start command: `npm start`

### Frontend (Vercel / Netlify)
1. Update `vite.config.js` proxy OR set `VITE_API_URL` env var pointing to deployed backend
2. Build command: `npm run build`
3. Output directory: `dist`

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Axios, React Router v6, jsPDF
- **Backend**: Node.js, Express 4, Mongoose, JWT, bcryptjs
- **Database**: MongoDB

---

## 📝 Notes

- The "Upgrade to Pro" button in this demo simulates payment (no real payment gateway). Wire up Razorpay or Stripe to collect real payments.
- JWT tokens are stored in `localStorage`. For production, consider httpOnly cookies.
- All invoice PDFs are generated client-side using jsPDF — no server PDF generation needed.
