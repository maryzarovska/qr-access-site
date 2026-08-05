console.log("=== Starting server ===");

const express = require('express');
const crypto = require('crypto');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/ping', (req, res) => {
    res.send('pong');
});

app.get('/start', async (req, res) => {
    try {
        const tokenId = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
        await db.createToken(tokenId, expiresAt);
        console.log(`Token: ${tokenId}`);
        res.redirect(`/form/${tokenId}`);
    } catch (err) {
        console.error('/start error:', err.message);
        res.status(500).send('Server error. Please try again.');
    }
});

app.get('/form/:tokenId', async (req, res) => {
    try {
        const token = await db.getToken(req.params.tokenId);
        if (!token) {
            return res.send(`
                <!DOCTYPE html><html><head><meta charset="UTF-8">
                <style>body{background:#1a1a1a;color:#ff6b00;font-family:Arial;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;text-align:center}
                h1{font-size:3em}p{color:#ffa366;font-size:1.2em}</style></head>
                <body><div><h1>⚠️ Expired</h1><p>This link has expired or already been used.</p><p>Please scan the QR code again.</p></div></body></html>
            `);
        }
        res.sendFile(path.join(__dirname, 'public', 'form.html'));
    } catch (err) {
        console.error('/form error:', err.message);
        res.status(500).send('Server error. Please try again.');
    }
});

app.post('/submit/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { phone, name } = req.body;

        if (!phone || !name) {
            return res.status(400).json({ error: 'Phone and name required' });
        }

        const token = await db.getToken(tokenId);
        if (!token) {
            return res.status(410).json({ error: 'Token expired or used' });
        }

        await db.useToken(tokenId);
        await db.saveSubmission(phone, name, tokenId);

        console.log(`Saved: ${name} - ${phone}`);
        res.json({ success: true });
    } catch (err) {
        console.error('/submit error:', err.message);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).send('Something went wrong');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
