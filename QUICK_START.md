# 🚀 Quick Start Guide - Academic Exchange

Get your project running in **5 minutes**!

---

## ⚡ Quick Setup

### 1️⃣ Install Dependencies
```bash
cd academic-exchange/backend
npm install
```

---

### 2️⃣ Set Up Supabase

#### Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → Sign up/Login
2. Click **"New Project"**
3. Set a **strong database password** (save it!)
4. Wait for setup to complete (~2 minutes)

#### Create Storage Bucket
1. Go to **Storage** (left sidebar)
2. Click **"New Bucket"**
3. Name: `uploads`
4. ✅ **Make it Public**

#### Get Credentials
1. Go to **Settings → API**
   - Copy **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - Copy **anon public** key
2. Go to **Settings → Database**
   - Copy **Connection String (URI)**
   - Replace `[YOUR-PASSWORD]` with your actual database password

---

### 3️⃣ Create `.env` File

In `academic-exchange/backend/` create a file named `.env`:

```env
# Database
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.xxxxx.supabase.co:5432/postgres

# Supabase Storage
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGci...your_long_key_here

# JWT Secret (generate with command below)
JWT_SECRET=your_random_secret_here

# Port
PORT=5000
```

**Generate JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### 4️⃣ Initialize Database

Run the setup script:
```bash
cd academic-exchange/backend
node setup_db.js
```

Expected output:
```
✅ SUCCESS! All tables created successfully.
📋 Tables created:
  - users
  - listings
  - wishlist
  - messages
```

---

### 5️⃣ Create Admin Account (Optional)

```bash
node setupadmin.js
```

Follow the prompts:
```
Enter admin name: Your Name
Enter admin email: admin@example.com
Enter admin password: ********
```

---

### 6️⃣ Start the Server

```bash
npm start
```

You should see:
```
Server running on port 5000
SERVING FRONTEND FROM: .../frontend
Created 'uploads' folder successfully.
```

---

### 7️⃣ Open Your Browser

Navigate to:
```
http://localhost:5000
```

🎉 **You're done!** The app should now be running!

---

## ✅ Quick Test Checklist

- [ ] Can you see the homepage?
- [ ] Can you click "Login / Register"?
- [ ] Can you register a new account?
- [ ] After login, can you see "Profile" button?
- [ ] Can you click "+ Sell New Item"?
- [ ] Can you upload an image?

---

## 🐛 Troubleshooting

### "Cannot connect to database"
**Fix:**
- Check DATABASE_URL in `.env`
- Verify password is correct (no spaces)
- Ensure Supabase project is active

### "JWT_SECRET not set" warning
**Fix:**
```bash
# Generate a secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env
JWT_SECRET=generated_secret_here
```

### "Network Error" when uploading
**Fix:**
- Check SUPABASE_URL and SUPABASE_KEY in `.env`
- Verify `uploads` bucket exists in Supabase Storage
- Make sure bucket is **Public**

### Port 5000 already in use
**Fix:**
```bash
# Change PORT in .env
PORT=3000

# Or kill the process using port 5000
# Windows:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

---

## 📂 Project Structure

```
academic-exchange/
├── backend/
│   ├── config/         # Database & Supabase configs
│   ├── middleware/     # Authentication
│   ├── routes/         # API endpoints
│   ├── server.js       # Main server
│   ├── setup_db.js     # Database setup script
│   ├── setupadmin.js   # Admin account creator
│   └── .env            # YOUR config (create this)
└── frontend/
    ├── css/
    ├── js/
    └── index.html
```

---

## 🎯 Next Steps

- ✅ Create some test listings
- ✅ Test the chat feature
- ✅ Try the wishlist functionality
- ✅ Check the admin panel (if you created admin)
- ✅ Customize categories in `frontend/js/main.js`

---

## 📚 Full Documentation

For detailed setup and deployment:
- **SETUP_GUIDE.md** - Complete installation guide
- **FIXES_APPLIED.md** - Recent changes and fixes
- **README.md** - Project overview

---

**Need help?** Check the troubleshooting section or review the detailed guides!
