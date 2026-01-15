const { Pool } = require('pg');
require('dotenv').config();

// Connect to the Render Database using the URL you saved
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // This is REQUIRED for Render to work
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
