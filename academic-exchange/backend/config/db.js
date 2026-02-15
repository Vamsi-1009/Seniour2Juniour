const { Pool } = require('pg');
require('dotenv').config();

const isLocalhost = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isLocalhost ? false : {
        rejectUnauthorized: false
    }
});

pool.on('connect', () => {
    console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err.message);
});

module.exports = pool;
