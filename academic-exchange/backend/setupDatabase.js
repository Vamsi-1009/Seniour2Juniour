const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function setupDatabase() {
    const isLocalhost = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost');
    
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isLocalhost ? false : { rejectUnauthorized: false }
    });

    try {
        console.log('🔄 Connecting to database...');
        
        const sqlFile = fs.readFileSync(path.join(__dirname, 'database.sql'), 'utf8');
        
        await pool.query(sqlFile);
        
        console.log('✅ Database tables created successfully!');
        console.log('\n📋 Tables:');
        console.log('  - users');
        console.log('  - listings');
        console.log('  - wishlist');
        console.log('  - messages');
        console.log('  - recently_viewed');
        console.log('  - reports');
        console.log('\n🎉 Database setup complete!');
        
    } catch (error) {
        console.error('❌ Error setting up database:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

setupDatabase();
