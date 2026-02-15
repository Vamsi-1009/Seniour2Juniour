const bcrypt = require('bcrypt');
const pool = require('./config/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    try {
        console.log("\n🔧 Admin Account Setup");
        console.log("=" .repeat(40));

        const name = await question("Enter admin name: ");
        const email = await question("Enter admin email: ");
        const password = await question("Enter admin password: ");

        if (!name || !email || !password) {
            console.log("❌ All fields are required!");
            rl.close();
            process.exit(1);
        }

        // Check if user already exists
        const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            console.log("❌ A user with this email already exists!");
            rl.close();
            process.exit(1);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert admin user
        const result = await pool.query(
            'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
            [name, email, hashedPassword, 'admin']
        );

        console.log("\n✅ Admin account created successfully!");
        console.log("=" .repeat(40));
        console.log("📧 Email:", result.rows[0].email);
        console.log("👤 Name:", result.rows[0].name);
        console.log("🔑 Role:", result.rows[0].role);
        console.log("=" .repeat(40));
        console.log("\nYou can now login with these credentials.");

    } catch (err) {
        console.error("❌ Error creating admin:", err.message);
    } finally {
        rl.close();
        await pool.end();
    }
}

createAdmin();
