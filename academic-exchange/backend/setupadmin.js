const db = require('./config/db');
const bcrypt = require('bcrypt');

// --- YOUR DESIRED CREDENTIALS ---
const ADMIN_USERNAME = "Vamsi";
const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin123";

async function setupAdmin() {
    console.log("🔧 specific Admin Reset Starting...");

    // 1. Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt);

    // 2. Check if this email exists
    try {
        const { rows } = await db.query("SELECT * FROM users WHERE email = $1", [ADMIN_EMAIL]);
        const existingUser = rows[0];

        if (existingUser) {
            // UPDATE EXISTING USER (Force Password & Role Change)
            await db.query(
                "UPDATE users SET username = $1, password_hash = $2, role = 'admin' WHERE email = $3",
                [ADMIN_USERNAME, hashedPassword, ADMIN_EMAIL]
            );
            console.log(`✅ FOUND Existing User. FORCED update to password: ${ADMIN_PASSWORD}`);
        } else {
            // CREATE NEW USER
            await db.query(
                "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
                [ADMIN_USERNAME, ADMIN_EMAIL, hashedPassword]
            );
            console.log(`✅ CREATED New Admin User with password: ${ADMIN_PASSWORD}`);
        }

        console.log("\n🚀 YOU CAN LOGIN NOW:");
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Pass:  ${ADMIN_PASSWORD}`);

        // Exit process since this is a script
        process.exit(0);
    } catch (err) {
        console.error("❌ Error setting up admin:", err);
        process.exit(1);
    }
}

setupAdmin();
