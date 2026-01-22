const { Pool } = require('pg');
require('dotenv').config();

// The code will look for "DATABASE_URL" in your Render Dashboard.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render')) ? {
        rejectUnauthorized: false
    } : false
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
