const express = require('express');
const router = express.Router();
const {Application, User} = require('../models')
const path = require('path');
const sequelize = require('../config/database');
const { sendAcceptanceEmail, sendRejectionEmail } = require('../utils/emailSender');
const {hashPassword} = require('../utils/hash');
const {verifyAdminToken, verifyToken} = require('../utils/jwt');

router.get('/apply', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'apply.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.post('/apply', async (req, res) => {
    try {
        // Перевірка, чи існує вже користувач з такою поштою
        const existingUser = await User.findOne({ where: { email: req.body.email } });
        if (existingUser) {
            return res.status(400).json({ message: 'Користувач з такою поштою вже існує' });
        }
        const existingApp = await Application.findOne({ where: { email: req.body.email } });
        if (existingApp) {
            return res.status(400).json({ message: 'Заявка з таким email вже надіслана' });
        }

        // Хешування пароля перед збереженням
        const hashedPassword = await hashPassword(req.body.password)

        // Створення нової заявки з хешованим паролем
        const newApplication = await Application.create({
            ...req.body,
            password: hashedPassword
        });

        res.status(201).json(newApplication);
    } catch (error) {
        console.error('Помилка при створенні заявки:', error.message);
        res.status(500).json({ message: error.message });
    }
});

// Отримання всіх записів
router.get('/applications', verifyAdminToken, async (req, res) => {
    try {
        const applications = await Application.findAll({order: [['applicationDate', 'ASC']]});
        res.json(applications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Прийняти заявку
router.post('/applications/:id/accept', verifyAdminToken,async (req, res) => {
    const transaction = await sequelize.transaction();

    try {
        const application = await Application.findByPk(req.params.id, { transaction });
        if (!application) return res.status(404).json({ message: 'Заявку не знайдено' });

        // Перевіряємо, чи існує вже користувач з такою електронною поштою
        const existingUser = await User.findOne({ where: { email: application.email } }, { transaction });
        if (existingUser) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Користувач з такою електронною поштою вже існує' });
        }

        // Створюємо нового користувача в транзакції
        const newUser = await User.create({
            firstName: application.firstName,
            lastName: application.lastName,
            patronymic: application.patronymic,
            email: application.email,
            password: application.password,
            role: 'student',
            additionalInfo: {
                studentGroup: application.studentGroup
            }
        }, { transaction });

        // Відправляємо лист про прийняття заявки
        await sendAcceptanceEmail(application.email);

        // Видаляємо заявку, якщо користувач успішно створений
        await application.destroy({ transaction });

        // Підтверджуємо транзакцію
        await transaction.commit();

        res.json({ message: 'Користувача створено', user: newUser });
    } catch (error) {
        // Якщо сталася помилка, скасовуємо транзакцію
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});


// Відхилити заявку
router.post('/applications/:id/reject', verifyAdminToken, async (req, res) => {
    const transaction = await sequelize.transaction(); // Ініціалізація транзакції

    try {
        const application = await Application.findByPk(req.params.id, { transaction });
        if (!application) return res.status(404).json({ message: 'Заявку не знайдено' });

        // Надсилаємо лист про відхилення заявки
        await sendRejectionEmail(application.email);

        // Видаляємо заявку після того, як лист відправлено
        await application.destroy({ transaction });

        // Підтверджуємо транзакцію
        await transaction.commit();

        res.json({ message: 'Заявку відхилено' });
    } catch (error) {
        // Якщо сталася помилка, скасовуємо транзакцію
        await transaction.rollback();
        res.status(500).json({ error: error.message });
    }
});

router.get('/applications/manage', verifyAdminToken,function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'manage-applications.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

module.exports = router;