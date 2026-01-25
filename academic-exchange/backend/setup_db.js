const { Pool } = require('pg');

// PASTE YOUR COPIED RENDER URL INSIDE THE QUOTES BELOW:
const connectionString = "postgresql://academic_db_p2lf_user:HMAAGnDkruGd7F7tu7fd4tSp0VivWo4L@dpg-d5qejo75r7bs738j62tg-a.singapore-postgres.render.com/academic_db_p2lf"; 

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
        console.log("Connecting to Render Database...");
        await pool.query(createTablesQuery);
        console.log("✅ SUCCESS! All tables created successfully in the cloud.");
    } catch (err) {
        console.error("❌ ERROR:", err.message);
    } finally {
        await pool.end();
    }
}

setup();
