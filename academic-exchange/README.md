# 🎓 Academic Exchange - Student Marketplace

A premium full-stack marketplace platform built exclusively for students with **Pure JavaScript**, **Glassmorphism UI**, and **Real-time Chat**.

## ✨ Features Implemented

### 🎨 Premium UI/UX
- ✅ Stunning Glassmorphism design
- ✅ Animated floating orbs
- ✅ Smooth transitions & hover effects
- ✅ Responsive mobile-first design
- ✅ Modern gradient accents

### 🔐 Authentication & Security
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ Protected routes
- ✅ Role-based access (User/Admin)
- ✅ Secure session management

### 📦 Marketplace Features
- ✅ Create, Read, Update, Delete listings
- ✅ Multiple image upload (up to 5 images)
- ✅ Category & condition filtering
- ✅ Real-time search
- ✅ Price filtering
- ✅ Location-based search
- ✅ View counts
- ✅ Similar items recommendations

### 💬 Real-time Chat
- ✅ Socket.io powered messaging
- ✅ WhatsApp-style chat UI
- ✅ Listing-specific conversations
- ✅ Real-time message delivery

### 👤 User Profiles
- ✅ Avatar upload
- ✅ Profile editing
- ✅ My listings management
- ✅ View own listings status

### 💚 Wishlist System
- ✅ Add/remove from wishlist
- ✅ Persistent wishlist storage
- ✅ Quick access to saved items

### 🔧 Admin Dashboard
- ✅ Platform statistics
- ✅ User management
- ✅ Listing moderation
- ✅ Delete users/listings

## 🚀 Quick Start

### Prerequisites
- Node.js v16+ installed
- PostgreSQL installed and running
- Git

### Installation

1. **Navigate to backend:**
```bash
cd academic-exchange/backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
The `.env` file is already configured for local development with:
- Database: `postgresql://postgres:2002@localhost:5432/academic_exchange`
- JWT Secret: Pre-generated
- Port: 5000

If your PostgreSQL password is different, update the `.env` file.

4. **Initialize database:**
```bash
node setupDatabase.js
```

5. **Create admin account (optional):**
```bash
node setupAdmin.js
```

6. **Start the server:**
```bash
npm start
```

7. **Open your browser:**
```
http://localhost:5000
```

## 📁 Project Structure

```
academic-exchange/
├── backend/
│   ├── config/
│   │   └── db.js              # Database connection
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── auth.js            # Login/Register
│   │   ├── listings.js        # CRUD for listings
│   │   ├── user.js            # Profile management
│   │   ├── wishlist.js        # Wishlist operations
│   │   └── admin.js           # Admin dashboard
│   ├── uploads/               # Image storage
│   ├── server.js              # Main server with Socket.io
│   ├── database.sql           # Database schema
│   ├── setupDatabase.js       # DB initialization
│   ├── setupAdmin.js          # Admin creator
│   ├── package.json
│   └── .env                   # Configuration
└── frontend/
    ├── css/
    │   └── styles.css         # Glassmorphism UI
    ├── js/
    │   └── main.js            # App logic
    └── index.html             # Single page app
```

## 🎯 How to Use

### For Students (Regular Users)

1. **Register/Login:**
   - Click "Sign Up" to create an account
   - Or "Login" if you already have one

2. **Browse Listings:**
   - View all listings on homepage
   - Use search bar for quick find
   - Filter by category (Engineering, MBBS, Law, Gadgets)
   - Sort by price or popularity

3. **Sell Items:**
   - Click "+ Sell" button (after login)
   - Fill in title, description, price
   - Select category and condition
   - Upload 1-5 images
   - Click "Post Listing"

4. **View Profile:**
   - Click "Profile" to see your info
   - View all your active listings
   - See listing status (active/sold)

5. **Chat with Sellers:**
   - Click on any listing to view details
   - Real-time chat with seller
   - Negotiate prices

### For Admins

1. **Create Admin Account:**
```bash
cd backend
node setupAdmin.js
```

2. **Access Admin Panel:**
   - Login with admin credentials
   - Admin button appears in navbar
   - View statistics
   - Manage users
   - Moderate listings

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login

### Listings
- `GET /api/listings` - Get all listings
- `GET /api/listings/:id` - Get single listing
- `POST /api/listings` - Create listing (auth required)
- `PUT /api/listings/:id` - Update listing (auth required)
- `DELETE /api/listings/:id` - Delete listing (auth required)

### User
- `GET /api/user/profile` - Get profile (auth required)
- `PUT /api/user/profile` - Update profile (auth required)
- `POST /api/user/avatar` - Upload avatar (auth required)

### Wishlist
- `GET /api/wishlist` - Get wishlist (auth required)
- `POST /api/wishlist/:listingId` - Toggle wishlist (auth required)

### Admin
- `GET /api/admin/stats` - Platform stats (admin only)
- `GET /api/admin/users` - All users (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)

## 🎨 Technology Stack

### Backend
- **Node.js** - Runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **Socket.io** - Real-time chat
- **JWT** - Authentication
- **Bcrypt** - Password hashing
- **Multer** - File uploads

### Frontend
- **Pure Vanilla JavaScript** - No frameworks
- **Modern CSS3** - Glassmorphism effects
- **Socket.io Client** - Real-time updates
- **HTML5** - Semantic markup

## 🌟 Key Features

### No TypeScript, No Build Step
- Pure `.js` files only
- Runs directly with Node.js
- No compilation required
- Easy debugging

### Glassmorphism UI
- Frosted glass effects
- Blur backgrounds
- Gradient accents
- Smooth animations
- Professional design

### Real-time Everything
- Instant messaging
- Live listing updates
- Socket.io integration

### Database Features
- UUID primary keys
- Indexed queries for speed
- Cascading deletes
- Referential integrity

## 📊 Database Schema

- **users** - User accounts and profiles
- **listings** - Marketplace items
- **wishlist** - Saved items per user
- **messages** - Chat history
- **recently_viewed** - User browsing history
- **reports** - Abuse reporting system

## 🔒 Security Features

- JWT token expiry (7 days)
- Password strength requirements
- Protected API routes
- SQL injection prevention
- XSS protection
- File type validation
- File size limits (5MB for listings, 2MB for avatars)

## 🎓 Perfect For

- Student book exchanges
- Academic notes sharing
- Gadget marketplace
- Lab equipment trading
- College resource hub

## 🚀 Deployment Ready

Works on:
- Local development
- Render
- Railway
- Heroku
- DigitalOcean
- AWS
- Any Node.js hosting

## 📝 Environment Variables

```env
DATABASE_URL=postgresql://user:pass@host:port/dbname
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
```

## 🎉 Success!

Your Academic Exchange platform is now running! 

Visit **http://localhost:5000** to see the stunning Glassmorphism UI in action.

---

Built with ❤️ using Pure JavaScript
