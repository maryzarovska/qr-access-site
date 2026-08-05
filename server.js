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
        res.status(500).send('Помилка на сервері. Будь ласка, спробуйте ще раз.');
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
                <body><div><h1>⚠️ Час вичерпано</h1><p>Ваш доступ до форми вичерпано або посилання вже використано.</p><p>Будь ласка, відскануйте QR-код ще раз.</p></div></body></html>
            `);
        }
        res.sendFile(path.join(__dirname, 'public', 'form.html'));
    } catch (err) {
        console.error('/form error:', err.message);
        res.status(500).send('Помилка на сервері. Будь ласка, спробуйте ще раз.');
    }
});

app.post('/submit/:tokenId', async (req, res) => {
    try {
        const { tokenId } = req.params;
        const { phone, name } = req.body;

        if (!phone || !name) {
            return res.status(400).json({ error: 'Заповніть поля для номеру телефону та імені' });
        }

        const token = await db.getToken(tokenId);
        if (!token) {
            return res.status(410).json({ error: 'Токен вичерпано або вже використано' });
        }

        await db.useToken(tokenId);
        await db.saveSubmission(phone, name, tokenId);

        console.log(`Збережено: ${name} - ${phone}`);
        res.json({ success: true });
    } catch (err) {
        console.error('/submit error:', err.message);
        res.status(500).json({ error: 'Помилка на сервері. Будь ласка, спробуйте ще раз.' });
    }
});

app.use((err, req, res, next) => {
    console.error('Помилка:', err.message);
    res.status(500).send('Щось пішло не так');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
