const { Pool } = require('pg');
require('dotenv').config();

// Use DATABASE_URL from .env file
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error("❌ ERROR: DATABASE_URL not found in .env file");
    process.exit(1);
}

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

const createTablesQuery = `
    CREATE TABLE IF NOT EXISTS users (
        user_id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        avatar VARCHAR(255),
        role VARCHAR(50) DEFAULT 'student',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS listings (
        listing_id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id),
        title VARCHAR(255),
        description TEXT,
        price DECIMAL(10, 2),
        category VARCHAR(50),
        subcategory VARCHAR(50),
        condition VARCHAR(50),
        location VARCHAR(100),
        images TEXT[],
        status VARCHAR(20) DEFAULT 'active',
        views INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS wishlist (
        wishlist_id SERIAL PRIMARY KEY,
        user_id UUID REFERENCES users(user_id),
        listing_id INTEGER REFERENCES listings(listing_id)
    );

    CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        listing_id INTEGER,
        sender_id UUID,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
`;

async function setup() {
    try {
        console.log("🔄 Connecting to Database...");
        console.log("📍 URL:", connectionString.replace(/:[^:@]+@/, ':****@')); // Hide password
        await pool.query(createTablesQuery);
        console.log("✅ SUCCESS! All tables created successfully.");
        console.log("\n📋 Tables created:");
        console.log("  - users");
        console.log("  - listings");
        console.log("  - wishlist");
        console.log("  - messages");
        console.log("\n🎉 Database setup complete! You can now run the server.");
    } catch (err) {
        console.error("❌ ERROR:", err.message);
        console.error("\n💡 Troubleshooting:");
        console.error("  1. Check your DATABASE_URL in .env file");
        console.error("  2. Make sure your database password is correct");
        console.error("  3. Verify your Supabase project is active");
    } finally {
        await pool.end();
    }
}

setup();
