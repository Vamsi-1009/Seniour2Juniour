const { Pool } = require('pg');
require('dotenv').config();

// 👇 WE ARE PASTING THE LINK DIRECTLY HERE TO FORCE IT TO WORK
const connectionString = "postgresql://academic_db_v2_user:EC9B8KBtBH7CMa9ELENgWKQh3LnvfGM3@dpg-d5kecf4oud1c73ei1seg-a/academic_db_v2";

const pool = new Pool({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

console.log("🔌 Attempting to connect to database...");

module.exports = {
    query: (text, params) => pool.query(text, params),
};
