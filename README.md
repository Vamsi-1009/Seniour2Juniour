📚 Academic Exchange Platform

A full-stack web application that allows students to buy, sell, or rent academic books and study materials.
The platform connects sellers and buyers in a simple, secure, and affordable way.

🚀 Project Overview

Many students finish semesters with unused books, while others struggle to find affordable resources.
Academic Exchange solves this by providing a centralized marketplace for educational materials.

Users can:

Register & log in securely

List books for sale or rent

Browse available listings

Contact sellers

Manage their own listings

🛠️ Tech Stack
Frontend

HTML

CSS

JavaScript

Tailwind CSS (if used)

Backend

Node.js

Express.js

MySQL

JWT Authentication

bcrypt (password hashing)

dotenv (environment variables)

📂 Project Structure
project-root/
│
├── backend/
│   ├── config/          # Database configuration
│   ├── controllers/     # Business logic
│   ├── routes/          # API routes
│   ├── middleware/      # Auth & error handling
│   ├── models/          # Database queries
│   ├── app.js           # Express app
│   └── server.js        # Server entry point
│
├── frontend/
│   ├── index.html
│   ├── css/
│   └── js/
│
├── .env
├── package.json
└── README.md

🔐 Authentication Flow

User passwords are hashed using bcrypt

Login returns a JWT token

Protected routes require valid JWT

Token is verified using middleware

🗄️ Database Design

Main tables:

users

listings

categories

orders (optional)

Features:

Foreign key relationships

Indexed columns for faster queries

Input validation before DB operations

⚙️ Installation & Setup
1️⃣ Clone the Repository
git clone https://github.com/your-username/academic-exchange.git
cd academic-exchange

2️⃣ Install Backend Dependencies
cd backend
npm install

3️⃣ Configure Environment Variables

Create a .env file in backend/:

PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=academic_exchange
JWT_SECRET=your_jwt_secret

4️⃣ Start the Server
npm start


Server will run at:

http://localhost:5000

📡 API Endpoints (Sample)
Auth

POST /api/auth/register

POST /api/auth/login

Listings

GET /api/listings

POST /api/listings

PUT /api/listings/:id

DELETE /api/listings/:id

🧪 Testing

Use Postman to test APIs

Verify protected routes using JWT token

Test database constraints and validations

🐞 Known Issues

Some routes may have missing validations

UI improvements pending

Pagination & search optimization not implemented

🔮 Future Enhancements

Image uploads for listings

Search & filter functionality

Chat between buyer and seller

Admin dashboard

Deployment on cloud (AWS / Render)

👨‍💻 Contributors

Vamsi – Backend & Database

Friends / Team members – Feature contributions

📜 License

This project is created for educational purposes.
