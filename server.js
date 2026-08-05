console.log("=== Starting server ===");

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

setInterval(() => {
    db.prepare("DELETE FROM tokens WHERE expires_at < datetime('now')").run();
}, 60000);

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/start', (req, res) => {
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    db.prepare("INSERT INTO tokens (id, expires_at) VALUES (?, ?)").run(tokenId, expiresAt);
    
    console.log(`✅ Token created: ${tokenId}`);
    res.redirect(`/form/${tokenId}`);
});

app.get('/form/:tokenId', (req, res) => {
    const { tokenId } = req.params;

    const token = db.prepare(
        "SELECT * FROM tokens WHERE id = ? AND expires_at > datetime('now') AND used = 0"
    ).get(tokenId);

    if (!token) {
        return res.status(410).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { 
                        background: #1a1a1a; 
                        color: #ff6b00; 
                        font-family: Arial, sans-serif;
                        display: flex; 
                        justify-content: center; 
                        align-items: center; 
                        height: 100vh; 
                        margin: 0; 
                        text-align: center;
                    }
                    h1 { font-size: 3em; }
                    p { color: #ffa366; font-size: 1.2em; }
                </style>
            </head>
            <body>
                <div>
                    <h1>⚠️ Expired</h1>
                    <p>This access link has expired or already been used.</p>
                    <p>Please scan the QR code again.</p>
                </div>
            </body>
            </html>
        `);
    }

    res.sendFile(path.join(__dirname, 'public', 'form.html'));
});

app.post('/submit/:tokenId', (req, res) => {
    const { tokenId } = req.params;
    const { phone, name } = req.body;

    if (!phone || !name) {
        return res.status(400).json({ error: 'Phone and name are required' });
    }

    const token = db.prepare(
        "SELECT * FROM tokens WHERE id = ? AND expires_at > datetime('now') AND used = 0"
    ).get(tokenId);

    if (!token) {
        return res.status(410).json({ error: 'Token expired or already used' });
    }

    db.prepare("UPDATE tokens SET used = 1 WHERE id = ?").run(tokenId);
    db.prepare("INSERT INTO submissions (phone, name, token_id) VALUES (?, ?, ?)").run(phone, name, tokenId);

    console.log(`📝 Submission saved: ${name} - ${phone}`);
    res.json({ success: true, message: 'Thank you!' });
});

app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 Test: http://localhost:${PORT}/ping`);
    console.log(`📍 QR endpoint: http://localhost:${PORT}/start`);
});