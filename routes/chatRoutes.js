const express = require('express');
const path = require('path');
const router = express.Router();
const { Chat, Topic, UserTopic , Message, ChatRead} = require('../models');
const { verifyToken, verifyAdminToken } = require("../utils/jwt");
const { checkChatAccessHtml, checkChatAccessApi } = require('../utils/chatAccess');
const { Op } = require('sequelize');
const { literal } = require('sequelize');

// Роут для доступу до чату через HTML
router.get('/chat/:id', verifyToken, checkChatAccessHtml, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'private', 'chat.html'));
});

// Роут для доступу до чату через API
router.get('/api/chat/:id', verifyToken, checkChatAccessApi, (req, res) => {
    res.json({ name: req.chat.name });
});

router.get('/api/chat/:id/messages', verifyToken, checkChatAccessApi, async function (req, res) {
    const chatId = req.params.id;
    const userId = req.user.id;

    // Параметри пагінації з query (наприклад: ?limit=25&offset=0)
    const limit = parseInt(req.query.limit, 10) || 25;
    const offset = parseInt(req.query.offset, 10) || 0;

    try {
        const chat = req.chat; // Використовуємо chat з попереднього middleware (checkChatAccessApi)

        const messages = await Message.findAll({
            where: { chatId },
            order: [['sentAt', 'DESC']],
            limit,
            offset
        });

        res.json({ messages });

    } catch (err) {
        console.error('❌ Помилка при отриманні повідомлень:', err);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

router.get('/api/chat/:id/unread-count', verifyToken, checkChatAccessApi, async (req, res) => {
    const chatId = req.params.id;
    const userId = req.user.id;
    try {
        const chatRead = await ChatRead.findOne({
            where: { chatId, userId }
        });

        const lastReadAt = chatRead ? chatRead.lastReadAt : new Date(0); // Якщо запису немає, вважаємо що нічого не читалося

        const unreadCount = await Message.count({
            where: {
                chatId,
                sentAt: {
                    [Op.gt]: lastReadAt
                }
            }
        });

        res.json({ unreadCount });

    } catch (err) {
        console.error('❌ Помилка при отриманні кількості непрочитаних повідомлень:', err);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }

});

router.put('/api/chat/:id/messages/last-read', verifyToken, checkChatAccessApi, async (req, res) => {
    const chatId = req.params.id;
    const userId = req.user.id;
    const {messageId} = req.body;

    try {
        const lastReadMessage = await Message.findByPk(messageId, {
            attributes: ["sentAt"]
        });
        if (!lastReadMessage) {
            return res.status(404).json({ message: "Повідомлення не знайдено" });
        }

        const chatRead = await ChatRead.findOne({
            where: { chatId, userId }
        });

        if (!chatRead) {
            const newChatRead = await ChatRead.create({
                chatId,
                userId,
                lastReadAt: lastReadMessage.sentAt
            });
            return res.status(201).json({ message: "Запис про останнє прочитане повідомлення створено" });
        }

        if (lastReadMessage.sentAt > chatRead.lastReadAt) {
            chatRead.lastReadAt = lastReadMessage.sentAt;
            await chatRead.save();
            res.status(200).json({ message: "Час останнього прочитаного повідомлення успішно оновлено" });
        }
        else {
            res.status(200).json({ message: "Немає потреби в оновленні, це повідомлення вже було прочитане раніше або одночасно" });
        }


    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Помилка на сервері", error: err.message });
    }
});

router.get('/topics/:topicId/chat', verifyToken, async (req, res) => {
    const { topicId } = req.params;

    try {
        const chat = await Chat.findOne({
            where: { topicId: topicId },
            attributes: ['id']
        });

        if (!chat) {
            return res.status(404).json({ error: 'Чат для цього гуртка не знайдено' });
        }

        res.json({ chatId: chat.id });
    } catch (error) {
        console.error('Помилка при отриманні чату:', error);
        res.status(500).json({ error: 'Внутрішня помилка сервера' });
    }
});

router.get('/user-chats', verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Отримати всі topicId, на які підписаний користувач
        const userTopics = await UserTopic.findAll({
            where: { userId },
            attributes: ['topicId']
        });

        const topicIds = userTopics.map(ut => ut.topicId);

        // Знайти всі чати: або general, або topic, де user має підписку
        const userChats = await Chat.findAll({
            where: {
                [Op.or]: [
                    { type: 'general' },
                    { type: 'topic', topicId: { [Op.in]: topicIds } }
                ]
            },
            order: [
                // Спочатку загальний чат (сортування по типу)
                ['type', 'ASC'],

                // Потім за алфавітним порядком для тематичних чатів
                ['name', 'ASC']
            ]
        });

        res.status(200).json(userChats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Помилка при отриманні чатів", error: err.message });
    }
});

router.get('/my-chats', verifyToken, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'user-chats.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});



module.exports = router;
