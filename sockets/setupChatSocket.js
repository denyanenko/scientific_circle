const jwt = require('jsonwebtoken');
const { Message, Chat, UserTopic } = require('../models');

module.exports = function setupChatSocket(io) {
    // Перевірка авторизації через cookie
    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie;

        if (!cookieHeader) {
            return next(new Error('Не передано cookie'));
        }

        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => {
            const [key, ...v] = c.split('=');
            return [key, decodeURIComponent(v.join('='))];
        }));

        const accessToken = cookies.accessToken;
        if (!accessToken) {
            return next(new Error('AccessToken відсутній'));
        }

        try {
            const decoded = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
            socket.user = decoded;
            next();
        } catch (err) {
            return next(new Error('Недійсний токен'));
        }
    });

    // Перевірка доступу до чату
    async function hasAccessToChat(userId, chatId) {
        const chat = await Chat.findByPk(chatId);
        if (!chat) return { allowed: false, reason: 'Чат не знайдено' };

        if (chat.type === 'general') return { allowed: true };

        if (!chat.topicId) return { allowed: false, reason: 'Невірна конфігурація чату' };

        const isUserInTopic = await UserTopic.findOne({
            where: { userId, topicId: chat.topicId }
        });

        if (!isUserInTopic) return { allowed: false, reason: 'У вас немає доступу до цього чату' };

        return { allowed: true };
    }

    // Обробка з'єднання
    io.on('connection', (socket) => {

        socket.on('joinChat', async (chatId) => {
            try {
                const access = await hasAccessToChat(socket.user.id, chatId);

                if (!access.allowed) {
                    return socket.emit('errorMessage', access.reason);
                }

                socket.join(`chat_${chatId}`);
            } catch (err) {
                socket.emit('errorMessage', 'Сталася помилка при підключенні до чату');
            }
        });

        socket.on('leaveChat', (chatId) => {
            socket.leave(`chat_${chatId}`);
        });

        socket.on('sendMessage', async ({ chatId, message }) => {
            try {
                const access = await hasAccessToChat(socket.user.id, chatId);

                if (!access.allowed) {
                    return socket.emit('errorMessage', access.reason || 'Немає доступу до чату');
                }

                const saved = await Message.create({
                    chatId,
                    senderId: socket.user.id,
                    message,
                });

                io.to(`chat_${chatId}`).emit('newMessage', {
                    id: saved.id,
                    message: saved.message,
                    senderId: saved.senderId,
                    sentAt: saved.sentAt,
                });
            } catch (err) {
                console.error('❌ sendMessage: Помилка збереження повідомлення:', err);
                socket.emit('errorMessage', 'Сталася помилка при надсиланні повідомлення');
            }
        });

    });
};
