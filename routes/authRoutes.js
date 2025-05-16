const jwt = require('jsonwebtoken');
const {comparePassword, hashPassword} = require('../utils/hash');
const express = require("express");
const path = require("path");
const router = express.Router();
const {User,RefreshToken} = require('../models')
const {verifyToken, verifyAdminToken} = require("../utils/jwt");
const { sendResetPasswordEmail, sendInviteEmail } = require('../utils/emailSender');


router.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'login.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});


// Логін і генерація токенів
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ where: { email: email } });
        if (!user) return res.status(401).json({ message: 'Невірна пошта або пароль' });

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Невірна пошта або пароль' });

        // Генерація Access та Refresh токенів
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }  // Access token з коротким терміном дії
        );

        const refreshToken = jwt.sign(
            { id: user.id},
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: '7d' }  // Refresh token з довшим терміном дії
        );

        // Зберегти в БД
        const decoded = jwt.decode(refreshToken);
        await RefreshToken.create({
            token: refreshToken,
            userId: user.id,
            expiresAt: new Date(decoded.exp * 1000) // ← перетворюємо Unix timestamp в Date
        });


        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true,
            maxAge: 15 * 60 * 1000 // 15 хв
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 днів
        });
        // Відправляємо access token
        res.json({ accessToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Викликається на сторінках, щоб перевірити, чи залогінений користувач
router.post('/verifyAndRefresh', verifyToken, (req, res) => {
    // Якщо ми дійшли сюди — токен валідний або був оновлений
    return res.status(200).json({
        message: 'Користувач авторизований',
        user: req.user, // { id, role }
    });
});

router.post('/logout', async (req, res) => {
    const token = req.cookies.refreshToken;
    if (token) {
        await RefreshToken.destroy({ where: { token } });
    }
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return res.json({ message: 'Вийшли з системи' });
});

router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

    const token = jwt.sign(
        { email },
        process.env.JWT_RESET_PASWORD_SECRET,
        { expiresIn: '1h' }
    );

    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendResetPasswordEmail(email, resetLink)
    res.json({ message: 'Лист з інструкцією надіслано' });
});

router.get('/forgot-password', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'forgot-password.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.post('/reset-password', async (req, res) => {
    const { token, password } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWT_RESET_PASWORD_SECRET);
        const email = decoded.email;

        const user = await User.findOne({ where: { email } });
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

        user.password = await hashPassword(password);
        await user.save();

        res.json({ message: 'Пароль успішно оновлено' });
    } catch (err) {
        return res.status(400).json({ message: 'Недійсний або прострочений токен' });
    }
});

router.get('/reset-password', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', '/reset-password.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});
router.get('/send-invite', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', '/send-invite.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});
router.post('/invite', verifyAdminToken, async (req, res) => {
    const { email, role } = req.body;

    const user = await User.findOne({ where: { email } });
    if (user) return res.status(404).json({ message: 'Користувач з цим email вже існує' });

    const token = jwt.sign(
        { email, role },
        process.env.JWT_INVITE_SECRET,
        { expiresIn: '24h' }
    );

    const inviteLink = `${process.env.FRONTEND_URL}/invite?token=${token}`;

    await sendInviteEmail(email, inviteLink)
    res.json({ message: 'Лист з запрошенням надіслано' });
});

router.get('/invite', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', '/invite.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.post('/register-invite', async (req, res) => {
    const { firstName, lastName, patronymic, password, token, additionalInfo } = req.body;

    try {
        const payload = jwt.verify(token, process.env.JWT_INVITE_SECRET);
        const { email, role } = payload;

        // Перевірка дубліката
        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ message: 'Користувач з таким email вже існує' });

        const hashedPassword = await hashPassword(password)

        // Формування об'єкта для збереження
        const userData = {
            firstName,
            lastName,
            patronymic,
            email,
            role,
            password: hashedPassword,
            additionalInfo
        };

        await User.create(userData);

        return res.json({ message: 'Реєстрація пройшла успішно!' });

    } catch (err) {
        console.error(err);
        return res.status(400).json({ message: 'Невалідне або протерміноване запрошення' });
    }
});


module.exports = router;