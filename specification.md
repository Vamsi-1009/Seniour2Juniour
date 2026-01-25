Academic Exchange – Project Specification
1. Introduction
Academic Exchange is a web-based platform developed to help students buy, sell, or rent academic-related items such as books, notes, lab equipment, and study materials.
Many students purchase resources for a short academic period and later struggle to resell or reuse them. This project solves that problem by creating a student-focused marketplace where resources can be exchanged easily and affordably.

The system provides separate access for Users and Admin, ensuring better control, transparency, and security.

2. Objectives
To create a centralized platform for exchanging academic items
To allow students to upload products with images and pricing
To provide location-based product discovery
To enable admin monitoring of users and products
To ensure secure login and role-based access
3. Users of the System
3.1 Normal User
Register and login
Add academic items (with images)
View all available products
View own listed products
Chat with sellers
Buy or rent items
3.2 Admin
Secure admin-only login
View all registered users
View all products added by users
View product images
Delete inappropriate users or products
Monitor overall system usage
4. Functional Requirements
4.1 User Module
User registration and login using JWT authentication
Add products with title, description, price, type (sell/rent)
Upload multiple images per product
View products in card layout
View product details with image slider
Chat with product owner
Logout functionality
4.2 Admin Module
Admin login using fixed credentials
Dashboard showing:
Total users
Total products
View list of all users
View list of all products with images
Delete users/products if required
5. Non-Functional Requirements
User-friendly UI with responsive design
Secure authentication using tokens
Fast data loading from database
Platform independence (runs on any browser)
Scalable backend architecture
6. System Architecture
The project follows a Client–Server Architecture:

Frontend: HTML, CSS, JavaScript (served via Python HTTP server)
Backend: Node.js with Express.js
Database: SQLite (academic_exchange.db)
Image Storage: Local uploads folder
Authentication: JWT-based
7. Tools & Technologies Used
Frontend: HTML5, CSS3, JavaScript
Backend: Node.js, Express.js
Database: SQLite
Image Upload: Multer
API Testing: Postman
Version Control: Git & GitHub
8. Security Features
Role-based access control (User/Admin)
Token-based authentication
Protected admin routes
Validation of user inputs
9. Conclusion
Academic Exchange provides a practical and cost-effective solution for students to exchange academic materials. The system reduces waste, saves money, and encourages collaboration among students while giving administrators full control over the platform.
