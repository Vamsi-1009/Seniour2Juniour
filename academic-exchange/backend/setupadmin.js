const connectDB = require('./config/db');
const bcrypt = require('bcrypt');

// --- YOUR DESIRED CREDENTIALS ---
const ADMIN_USERNAME = "Vamsi";
const ADMIN_EMAIL = "admin@admin.com"; 
const ADMIN_PASSWORD = "admin123"; 

async function setupAdmin() {
    const db = await connectDB();
    console.log("🔧 specific Admin Reset Starting...");

    // 1. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // 2. Check if this email exists
    const existingUser = await db.get("SELECT * FROM users WHERE email = ?", [ADMIN_EMAIL]);

    if (existingUser) {
        // UPDATE EXISTING USER (Force Password & Role Change)
        await db.run(
            "UPDATE users SET username = ?, password_hash = ?, role = 'admin' WHERE email = ?",
            [ADMIN_USERNAME, hashedPassword, ADMIN_EMAIL]
        );
        console.log(`✅ FOUND Existing User. FORCED update to password: ${ADMIN_PASSWORD}`);
    } else {
        // CREATE NEW USER
        await db.run(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')",
            [ADMIN_USERNAME, ADMIN_EMAIL, hashedPassword]
        );
        console.log(`✅ CREATED New Admin User with password: ${ADMIN_PASSWORD}`);
    }

    console.log("\n🚀 YOU CAN LOGIN NOW:");
    console.log(`   Email: ${ADMIN_EMAIL}`);
    console.log(`   Pass:  ${ADMIN_PASSWORD}`);
}

setupAdmin();
