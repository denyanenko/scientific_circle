const {verifyToken} = require("../utils/jwt");
const express = require("express");
const path = require("path");
const router = express.Router();
const {User, Topic} = require('../models')
const{hashPassword, comparePassword} = require("../utils/hash");
const { literal } = require('sequelize');

router.get('/profile', verifyToken,function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'profile.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/api/profile', verifyToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!user) return res.status(404).json({ message: 'Користувач не знайдений' });
        res.json(user);
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.post('/profile/change-email', verifyToken, async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email і пароль обовʼязкові' });
    }

    try {
        const existingEmail = await User.findOne({
            where: { email },
            attributes: ['email']
        });

        if (existingEmail) {
            return res.status(400).json({ message: 'Email вже існує' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ message: 'Користувач не знайдений' });
        }

        const isPasswordValid = await comparePassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Неправильний пароль' });
        }

        user.email = email;
        await user.save();
        res.json({ message: 'Пошта оновлена' });
    } catch (error) {
        console.log(error.message)
        res.status(500).json({ message: 'Помилка сервера' });
    }
});


// Змінити пароль
router.post('/profile/change-password', verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: 'Необхідно вказати старий та новий пароль' });
    }

    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ message: 'Користувач не знайдений' });

        const isMatch = await comparePassword(oldPassword, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Старий пароль невірний' });

        user.password = await hashPassword(newPassword);
        await user.save();

        res.json({ message: 'Пароль успішно змінено' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});


router.delete('/delete-account', verifyToken, async (req, res) => {
    const id = req.user.id;
    const { password } = req.body;

    try {
        const user = await User.findByPk(id);
        if (!user) {
            return res.status(404).json({ message: 'Користувача не знайдено' });
        }

        const isMatch = await comparePassword(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Невірний пароль' });
        }

        await user.destroy();

        res.clearCookie('accessToken');
        res.clearCookie('refreshToken');
        return res.json({ message: 'Акаунт успішно видалено' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.get('/api/mentors/name', async (req, res) => {
    try {
        const fullNameLiteral = literal(`CONCAT("last_name", ' ', "first_name", ' ', COALESCE("patronymic", ''))`);

        const mentors = await User.findAll({
            where: { role: 'mentor' },
            attributes: [
                'id',
                [fullNameLiteral, 'name']
            ],
            order: [[fullNameLiteral, 'ASC']]
        });

        if (!mentors.length) {
            return res.status(404).json({ error: 'Не знайдено менторів' });
        }


        res.json(mentors);
    } catch (err) {
        console.error('Помилка при отриманні менторів:', err);
        res.status(500).json({ error: 'Помилка при отриманні менторів з бази даних' });
    }
});

router.get('/mentors-for-topic/:topicId', async (req, res) => {
    const { topicId } = req.params;

    try {
        const topic = await Topic.findByPk(topicId, { attributes: ['id'] });
        if (!topic) {
            return res.status(404).json({ error: 'Гурток не знайдено' });
        }

        const fullNameLiteral = literal(`CONCAT("last_name", ' ', "first_name", ' ', COALESCE("patronymic", ''))`);
        const mentors = await topic.getUsers({
            where: { role: 'mentor' },
            attributes: [
                'id',
                [fullNameLiteral, 'name']
            ],
            joinTableAttributes: [],
            order: [[fullNameLiteral, 'ASC']]
        });

        res.json(mentors);
    } catch (err) {
        console.error('Помилка при отриманні менторів:', err);
        res.status(500).json({ error: 'Помилка при отриманні менторів з бази даних' });
    }
});

router.get('/api/user/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await User.findByPk(id, {
            attributes: [
                'firstName',
                'lastName',
                'patronymic',
                'role',
                'additionalInfo'
            ]
        });

        if (!user) {
            return res.status(404).json({ message: 'Користувач не знайдений' });
        }

        res.json(user);
    } catch (error) {
        console.error('Помилка при отриманні користувача:', error);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});



module.exports = router;