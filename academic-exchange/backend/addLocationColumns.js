const pool = require('./config/db');

async function addLocationColumns() {
    try {
        console.log('Adding latitude and longitude columns to listings table...');

        await pool.query(`
            ALTER TABLE listings
            ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
            ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8)
        `);

        console.log('✅ Columns added successfully!');

        // Add index for faster location queries
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_listings_location
            ON listings(latitude, longitude)
        `);

        console.log('✅ Location index created!');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

addLocationColumns();
