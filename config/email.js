require('dotenv').config({ path: __dirname + '/../.env' });
const nodemailer = require('nodemailer');

// Створюємо транспортер для надсилання пошти
const transporter = nodemailer.createTransport({
    service: 'gmail', // Наприклад, для Gmail
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});


module.exports = transporter;