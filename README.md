# Mini Team Chat Application

A real-time team communication platform built using the MERN stack with OTP authentication, JWT security, channel-based messaging, and Socket.IO for instant message delivery.

---

## 📌 Core Features

- Phone number based authentication using Twilio OTP
- JWT-based secure login (no session cookies)
- Create / search / join public & private channels
- User can leave channels anytime
- Real-time messaging using Socket.IO
- Persistent chat storage in MongoDB
- Auto-generated avatar for each user
- Clean UI with React + Vite + Tailwind CSS
- Protected routes & auth context handling

---

## 🛠 Tech Stack

### **Frontend**
- React + Vite
- Tailwind CSS
- Axios
- React Router
- Socket.IO Client

### **Backend**
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- Twilio (OTP verification)
- JWT & bcrypt
- Socket.IO

---

## Project Structure
Mini-Team-Chat-Application
│
├── backend
│ ├── controllers
│ ├── middleware
│ ├── models
│ ├── routes
│ ├── utils
│ ├── socket
│ └── server.js
│
├── frontend
│ ├── src
│ │ ├── components
│ │ ├── pages
│ │ ├── context
│ │ └── utils
│ └── vite.config.js
│
├── README.md
└── package.json

## ⚙ Installation & Setup

### Clone Repo
```bash
git clone https://github.com/Praveenvkadam/Mini-Team-Chat-Application.git
cd Mini-Team-Chat-Application

## Run command
npm install
npm run dev






