const { Pool } = require('pg');
require('dotenv').config();

// ✅ NO HARDCODED PASSWORD HERE. 
// The code will look for "DATABASE_URL" in your Render Dashboard.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
