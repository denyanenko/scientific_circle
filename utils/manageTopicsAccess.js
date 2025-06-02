const { Topic, UserTopic } = require('../models');
const { verifyMentorOrAdmin } = require('../utils/jwt');

async function manageTopicAccess(req, res, next, isAPI = false) {
    verifyMentorOrAdmin(req, res, async () => {
        const topicId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;

        try {
            const topic = await Topic.findByPk(topicId);
            if (!topic) {
                return isAPI
                    ? res.status(404).json({ message: 'Гурток не знайдено' })
                    : res.redirect(`/error.html?message=Гурток не знайдено`);
            }

            if (userRole === 'mentor') {
                const link = await UserTopic.findOne({
                    where: { userId, topicId }
                });

                if (!link) {
                    return isAPI
                        ? res.status(403).json({ message: 'Доступ заборонено: ви не можете управляти цим гуртком.' })
                        : res.redirect(`/error.html?message=Доступ заборонено: ви не можете управляти цим гуртком.`);
                }
            }

            if (isAPI) req.topic = topic;
            return next();

        } catch (err) {
            console.error('❌ Помилка при перевірці доступу до гуртка:', err);
            return isAPI
                ? res.status(500).json({ error: 'Внутрішня помилка сервера' })
                : res.redirect(`/error.html?message=Внутрішня помилка сервера`);
        }
    });
}

async function manageTopicAccessHtml(req, res, next) {
    await manageTopicAccess(req, res, next, false);
}

async function manageTopicAccessApi(req, res, next) {
    await manageTopicAccess(req, res, next, true);
}

module.exports = {
    manageTopicAccessHtml,
    manageTopicAccessApi,
};
