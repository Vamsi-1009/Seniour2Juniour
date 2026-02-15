const bcrypt = require('bcrypt');
const pool = require('./config/db');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function createAdmin() {
    console.log('\n🔧 Create Admin Account\n');
    
    rl.question('Name: ', async (name) => {
        rl.question('Email: ', async (email) => {
            rl.question('Password: ', async (password) => {
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);
                    const result = await pool.query(
                        'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role',
                        [name, email, hashedPassword, 'admin']
                    );
                    console.log('\n✅ Admin created successfully!');
                    console.log(result.rows[0]);
                    process.exit(0);
                } catch (error) {
                    console.error('❌ Error:', error.message);
                    process.exit(1);
                }
            });
        });
    });
}

createAdmin();
