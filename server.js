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

// /start route
app.get('/start', async (req, res) => {
    try {
        const tokenId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await db.createToken(tokenId, expiresAt);
        res.redirect(`/form/${tokenId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// /form/:tokenId route
app.get('/form/:tokenId', async (req, res) => {
    try {
        const token = await db.getToken(req.params.tokenId);
        if (!token) {
            return res.status(410).send('Expired');
        }
        res.sendFile(path.join(__dirname, 'public', 'form.html'));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// /submit/:tokenId route
app.post('/submit/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { phone, name } = req.body;
        
        const token = await db.getToken(tokenId);
        if (!token) {
            return res.status(410).json({ error: 'Token expired' });
        }
        
        await db.useToken(tokenId);
        await db.saveSubmission(phone, name, tokenId);
        
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});
app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📍 Test: http://localhost:${PORT}/ping`);
    console.log(`📍 QR endpoint: http://localhost:${PORT}/start`);
});
