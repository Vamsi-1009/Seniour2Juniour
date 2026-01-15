const { Pool } = require('pg');
require('dotenv').config();

// 👇 WE ARE PASTING THE LINK DIRECTLY HERE TO FORCE IT TO WORK
const connectionString = "postgresql://academic_db_vwin_user:5QC1JsqgMZWikfbCFcLJ54rayFIKfkuc@dpg-d5kd1u3e5dus73a6lqmg-a/academic_db_vwin";

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
