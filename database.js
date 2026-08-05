const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    family: 4
});

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
        token_id TEXT REFERENCES tokens(id),
        submitted_at TIMESTAMP DEFAULT NOW()
    );
`);

function createToken(id, expiresAt) {
    return pool.query('INSERT INTO tokens (id, expires_at) VALUES ($1, $2)', [id, expiresAt]);
}

async function getToken(id) {
    const result = await pool.query(
        "SELECT * FROM tokens WHERE id = $1 AND expires_at > NOW() AND used = 0", 
        [id]
    );
    return result.rows[0];
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

// Clean expired tokens
setInterval(() => {
    pool.query("DELETE FROM tokens WHERE expires_at < NOW()");
}, 60000);

module.exports = { createToken, getToken, useToken, saveSubmission };
