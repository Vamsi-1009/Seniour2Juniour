📚 Academic Exchange: Full-Stack Marketplace

Academic Exchange is a high-performance, full-stack web application designed for students to facilitate the peer-to-peer exchange of academic resources. Built entirely using Vanilla JavaScript, HTML, and CSS (⚠️ no TypeScript anywhere), and powered by a Node.js runtime, the platform delivers a modern Glassmorphism UI with real-time interactivity — without relying on heavy frontend frameworks.

The platform is inspired by OLX-style marketplace functionality, customized exclusively for students to trade books, notes, gadgets, and academic resources securely — while supporting every core OLX feature in a student-first environment.

🔤 Language & Stack Guarantee

Pure JavaScript only (no TypeScript)

Frontend: HTML + CSS + Vanilla JavaScript

Backend: Node.js with plain .js files

No .ts files anywhere

No transpilers (Babel, SWC, ts-node, etc.)

No build step required

Runs directly using Node.js runtime

Beginner-friendly codebase

Simple debugging & deployment

🌟 Enhanced Feature Set
🎨 Trendy Premium Visual Experience

Built with pure HTML + CSS + Vanilla JavaScript

Glassmorphism UI with frosted cards

Gradient accents & neon highlights

Floating animated orbs

Smooth transitions & micro-interactions

Rounded cards & soft shadows

Touch-friendly mobile UI

Screenshot-ready design

Startup-grade visual polish

🛒 Full OLX-Style Marketplace

Post, browse, edit, delete, relist ads

Categories & subcategories

Price tagging & negotiable option

Condition (New / Used)

Product availability status

Mandatory image upload

Multiple images per listing

Wishlist

Recently viewed items

Featured ads

Listing expiry

Similar recommendations

View counts

Abuse reporting

Admin moderation

Draft listings

Sold / Reserved flags

📸 Image Upload System

Mandatory image upload for listings

Supports multiple images

Drag-and-drop upload UI

File picker fallback

Live image preview before submit

Client + server validation

Multer backend engine

JPG / PNG / WEBP support

Size limits

Auto file renaming

Secure storage

Image URLs stored in PostgreSQL

Reorder images

Remove images before submit

🖼️ Profile Avatar System

Upload profile avatar

Drag-and-drop + file picker

Live avatar preview

Auto resize & compression

Secure Multer storage

Avatar stored in PostgreSQL

Default avatar fallback

Replace or remove avatar

Used across:

Listings

Chat

Profiles

Admin UI

🧭 Navigation & Profile UX

Clean top navbar

All actions grouped in single Profile button

Dropdown menu

Role-based navbar (Admin vs User)

Guest vs Logged-in navbar layouts

Profile Menu (User)

My Listings

My Orders

Wishlist

Chat Inbox

Notifications

Edit Profile

Settings

Logout

Profile Menu (Admin)

Admin Dashboard

User Management

Listing Moderation

Payment Logs

Platform Analytics

Feature Toggles

Logout

Guest Navbar

Login

Register

Browse Listings

About

Contact

Hamburger menu

Touch optimized

Keyboard accessible

Avatar in navbar

Smooth dropdown animations

🧑‍💼 Role-Based Access Control

Roles:

User

Admin

Role stored in DB

Role-based route protection

Admin-only APIs

Admin-only UI

Permission-based toggles

Unauthorized access blocked

Future roles ready

🔍 Advanced Search & Discovery

Real-time search

Category filters

Price range

Condition filters

Location filters

Sort: Price, Distance, Newest, Popular

Saved searches

Recent keywords

Smart recommendations

💬 Real-Time Chat

Socket.io powered

WhatsApp-style UI

Typing indicators

Read receipts

Message reactions

Image sharing

Online / offline status

Chat blocking & reporting

💳 Payments & Transactions

Secure online payments

Order confirmation

Payment status tracking

Refund handling

Transaction history

Invoice generation

Admin dashboard

Razorpay / Stripe support

🔐 Security & Authentication

Bcrypt hashing

JWT auth

Role-based access

Protected routes

Secure payments

Session tracking

Login alerts

Rate limiting

🛠️ Technical Deep Dive
Backend Architecture

Node.js + Express

Plain JavaScript only

Multer uploads

JWT middleware

Socket.io

Role-based authorization

Modular minimal structure

Runs via Node runtime

Frontend Logic

Pure HTML + CSS + Vanilla JS

No frameworks

No TypeScript

SPA routing

Central UI state

Real-time sockets

Dynamic DOM rendering

Drag-drop logic

Image preview logic

Avatar upload logic

Navbar role switching

Guest vs user UI switching

📦 Dependency Management

Uses package.json

npm install setup

Version locking

Prod/dev separation

Core Dependencies

express

jsonwebtoken

bcrypt

multer

socket.io

pg

dotenv

cors

uuid

📂 Project Structure
academic-exchange/
├── backend/
│   ├── config/
│   ├── server.js
│   ├── setupAdmin.js
│   ├── database.sql
│   ├── package.json
│   └── .env.example
└── frontend/
    ├── css/
    │   └── styles.css
    ├── js/
    │   └── main.js
    └── index.html

🚀 Deployment & Local Orchestration
cd backend
npm install
npm run setup
npm start


Open: frontend/index.html

📜 Development Philosophy

JavaScript-only full stack

No TypeScript

No frontend frameworks

Node-powered backend

Performance-first

Trend-first UI

Student-first design

Minimal files

Cloud-ready

Platform-agnostic

OLX feature parity

Cross-device support

Deployment-first mindset

☁️ Universal Deployment Compatibility

Render

Railway

Fly.io

Heroku

Vercel backend

DigitalOcean

AWS

Netlify backend

GitHub runners

.env driven config

Stateless backend

Auto DB init

Zero config mismatches

🔮 Future Enhancements

AI fraud detection

Voice messages

Seller ratings

Verified profiles

WhatsApp Business API

Escrow payments

Advanced analytics

Docker deployment
