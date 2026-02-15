# 🚀 Academic Exchange - Complete Setup Guide

## Prerequisites
- Node.js (v16 or higher)
- PostgreSQL database (or Supabase account)
- A code editor (VS Code recommended)

---

## 📋 Step-by-Step Setup

### 1. Install Dependencies

Navigate to the backend directory and install packages:

```bash
cd academic-exchange/backend
npm install
```

This will install all required dependencies:
- express
- bcrypt
- jsonwebtoken
- multer
- socket.io
- pg (PostgreSQL driver)
- @supabase/supabase-js
- cors
- dotenv
- uuid

---

### 2. Set Up Supabase Storage

1. **Create a Supabase account** at [supabase.com](https://supabase.com)
2. **Create a new project**
3. **Create a storage bucket:**
   - Go to Storage → Create Bucket
   - Name: `uploads`
   - Set to **Public** (for image access)
4. **Get your credentials:**
   - Go to Settings → API
   - Copy your `Project URL` (SUPABASE_URL)
   - Copy your `anon/public` key (SUPABASE_KEY)

---

### 3. Set Up PostgreSQL Database

#### Option A: Use Supabase Database
1. Go to your Supabase project
2. Navigate to Settings → Database
3. Copy the **Connection String** (URI format)

#### Option B: Use Local PostgreSQL
```bash
# Create database
psql -U postgres
CREATE DATABASE academic_exchange;
\q
```

---

### 4. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```bash
cd academic-exchange/backend
cp .env.example .env
```

Edit `.env` with your actual values:

```env
# Database (Supabase PostgreSQL Connection String)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# Supabase Storage
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# JWT Secret (Generate a strong random string)
JWT_SECRET=your_super_secret_random_string_here_change_this

# Server Port
PORT=5000
```

**🔐 Generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 5. Initialize Database Schema

Create the database tables:

```bash
# If you have a database.sql file
cd academic-exchange/backend
psql $DATABASE_URL -f database.sql

# OR run the setup script if available
node setup_db.js
```

If there's no SQL file, you'll need to create the tables manually. Contact your database admin or check project documentation.

---

### 6. Create Admin User

```bash
cd academic-exchange/backend
node setupadmin.js
```

Follow the prompts to create an admin account.

---

### 7. Start the Server

```bash
cd academic-exchange/backend
npm start
```

You should see:
```
Server running on port 5000
SERVING FRONTEND FROM: E:\...\frontend
Created 'uploads' folder successfully.
```

---

### 8. Access the Application

Open your browser and navigate to:
```
http://localhost:5000
```

---

## 🧪 Testing the Setup

### Test 1: Check API Health
```bash
curl http://localhost:5000/listings
```
Should return `[]` (empty array) or existing listings.

### Test 2: Register a User
1. Open http://localhost:5000
2. Click "Login / Register"
3. Click "Register" link
4. Enter email and password
5. You should be logged in automatically

### Test 3: Upload a Listing
1. After logging in, click "Profile"
2. Click "+ Sell New Item"
3. Fill in the form
4. Upload an image
5. Submit

If the listing appears, Supabase storage is working correctly!

---

## 🐛 Troubleshooting

### Error: "Network Error" when posting listings
**Cause:** Supabase credentials not set correctly

**Fix:**
1. Check `.env` file has correct SUPABASE_URL and SUPABASE_KEY
2. Verify Supabase bucket named `uploads` exists
3. Ensure bucket is set to **Public**

---

### Error: "JWT_SECRET not set"
**Cause:** Missing environment variable

**Fix:**
```bash
# Generate a secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=generated_secret_here
```

---

### Error: "Cannot connect to database"
**Cause:** Invalid DATABASE_URL

**Fix:**
1. Verify PostgreSQL is running (if local)
2. Check Supabase connection string format:
   ```
   postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
   ```
3. Ensure SSL is enabled in Supabase settings

---

### Error: "Port 5000 already in use"
**Fix:**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:5000 | xargs kill -9

# OR change the port in .env
PORT=3000
```

---

## 📁 Project Structure

```
academic-exchange/
├── backend/
│   ├── config/
│   │   ├── db.js              # PostgreSQL connection
│   │   └── supabaseClient.js  # Supabase storage client
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   ├── routes/
│   │   ├── admin.js           # Admin panel routes
│   │   ├── auth.js            # Login/Register
│   │   ├── listings.js        # Create/Edit/Delete listings
│   │   ├── messages.js        # Chat system
│   │   ├── user.js            # Profile & avatar
│   │   └── wishlist.js        # Wishlist feature
│   ├── server.js              # Main server file
│   ├── setupadmin.js          # Admin account creation
│   ├── package.json           # Dependencies
│   └── .env                   # Environment variables (YOU CREATE THIS)
└── frontend/
    ├── css/
    │   └── styles.css         # Glassmorphism UI
    ├── js/
    │   └── main.js            # Vanilla JavaScript logic
    └── index.html             # Single page application
```

---

## 🚀 Deployment to Production

### Render.com (Recommended)

1. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Create Render Web Service**
   - Connect GitHub repository
   - Build Command: `cd academic-exchange/backend && npm install`
   - Start Command: `cd academic-exchange/backend && node server.js`

3. **Add Environment Variables on Render:**
   - DATABASE_URL
   - SUPABASE_URL
   - SUPABASE_KEY
   - JWT_SECRET
   - PORT (set to 5000)

4. **Deploy!**

---

## 🎯 Next Steps

- [ ] Install dependencies (`npm install`)
- [ ] Set up Supabase account
- [ ] Create `.env` file with credentials
- [ ] Initialize database schema
- [ ] Create admin user
- [ ] Start server and test
- [ ] Deploy to production (optional)

---

## 📞 Support

If you encounter any issues not covered here, check:
1. `FIXES_APPLIED.md` - List of all fixes applied
2. `README.md` - Project overview
3. Server console logs for error messages

---

**Project Status:** ✅ All errors fixed, ready for deployment
**Last Updated:** February 15, 2026
