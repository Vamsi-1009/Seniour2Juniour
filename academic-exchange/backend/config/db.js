const Pool = require('pg').Pool;
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Uses the URL you added to Render
    ssl: {
        rejectUnauthorized: false // Required for Render Cloud Database
    }
});

module.exports = pool;
