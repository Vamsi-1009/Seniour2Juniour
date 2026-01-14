const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

// ✅ Load environment variables from .env (inside backend folder)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function connectDB() {
    return open({
        // ✅ Points to 'academic-exchange/database.sqlite' (Root folder)
        filename: path.join(__dirname, '../../database.sqlite'), 
        driver: sqlite3.Database
    });
}

module.exports = connectDB;
