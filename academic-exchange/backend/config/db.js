const { Pool } = require('pg');
require('dotenv').config();

// 👇 PASTE YOUR NEW COPIED LINK HERE INSIDE THE QUOTES
const connectionString = "postgresql://academic_db_new_user:mFDPd6B6fNcmS78Xn1MJPJ8Faouhv7Pi@dpg-d5keh9dactks738vof80-a/academic_db_new"; 

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
};
