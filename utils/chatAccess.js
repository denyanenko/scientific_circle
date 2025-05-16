const path = require('path');
const { Chat, UserTopic } = require('../models');


async function checkChatAccess(req, res, next, isAPI = false) {
    const chatId = req.params.id;
    const userId = req.user.id;

    try {
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return isAPI
                ? res.status(404).json({ error: 'Чат не знайдено' })
                : res.redirect(`/error.html?message=Чат не знайдено`);
        }

        // Для загального чату — дозвіл всім авторизованим
        if (chat.type === 'general') {
            if(isAPI) req.chat = chat
            return next();
        }

        // Перевірка доступу до тематичного чату
        const topicId = chat.topicId;
        if (!topicId) {
            return isAPI
                ? res.status(400).json({ error: 'Невірна конфігурація чату' })
                : res.redirect(`/error.html?message=Невірна конфігурація чату`);
        }

        const isUserInTopic = await UserTopic.findOne({
            where: { userId, topicId }
        });

        if (!isUserInTopic) {
            return isAPI
                ? res.status(403).json({ error: 'У вас немає доступу до цього чату' })
                : res.redirect(`/error.html?message=У вас немає доступу до цього чату`);
        }

        if(isAPI) req.chat = chat
        return next();

    } catch (err) {
        console.error('❌ Помилка при перевірці доступу до чату:', err);
        return isAPI
            ? res.status(500).json({ error: 'Внутрішня помилка сервера' })
            : res.redirect(`/error.html?message=Внутрішня помилка сервера`);
    }
}

/**
 * Middleware для HTML (редірект на сторінку помилки)
 */
async function checkChatAccessHtml(req, res, next) {
    await checkChatAccess(req, res, next, false); // Для HTML передаємо false
}

/**
 * Middleware для API (JSON-відповідь)
 */
async function checkChatAccessApi(req, res, next) {
    await checkChatAccess(req, res, next, true); // Для API передаємо true
}

module.exports = {
    checkChatAccessHtml,
    checkChatAccessApi,
};
