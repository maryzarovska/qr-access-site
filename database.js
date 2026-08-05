const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Test connection on startup
pool.query('SELECT NOW()')
    .then(() => console.log('✅ Database connected'))
    .catch(err => console.error('❌ Database connection error:', err.message));

// Create tables
pool.query(`
    CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        created_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP NOT NULL,
        used INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        phone TEXT NOT NULL,
        name TEXT NOT NULL,
        token_id TEXT,
        submitted_at TIMESTAMP DEFAULT NOW()
    );
`).catch(err => console.error('Table creation error:', err.message));

function createToken(id, expiresAt) {
    return pool.query('INSERT INTO tokens (id, expires_at) VALUES ($1, $2)', [id, expiresAt]);
}

async function getToken(id) {
    try {
        const result = await pool.query(
            "SELECT * FROM tokens WHERE id = $1 AND expires_at > NOW() AND used = 0", 
            [id]
        );
        return result.rows[0];
    } catch (err) {
        console.error('getToken error:', err.message);
        return null;
    }
}

function useToken(id) {
    return pool.query("UPDATE tokens SET used = 1 WHERE id = $1", [id]);
}

function saveSubmission(phone, name, tokenId) {
    return pool.query(
        "INSERT INTO submissions (phone, name, token_id) VALUES ($1, $2, $3)", 
        [phone, name, tokenId]
    );
}

setInterval(() => {
    pool.query("DELETE FROM tokens WHERE expires_at < NOW()").catch(() => {});
}, 60000);

module.exports = { createToken, getToken, useToken, saveSubmission };
