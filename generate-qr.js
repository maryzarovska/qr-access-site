const QRCode = require('qrcode');
const path = require('path');

const SERVER_URL = 'https://qr-access-site.onrender.com';
const qrContent = `${SERVER_URL}/start`;

QRCode.toFile(
    path.join(__dirname, 'public', 'qr-code.png'),
    qrContent,
    {
        color: {
            dark: '#ff6b00',
            light: '#000000'
        },
        width: 500
    },
    (err) => {
        if (err) throw err;
        console.log('QR Code generated: public/qr-code.png');
        console.log(`Content: ${qrContent}`);
    }
);
