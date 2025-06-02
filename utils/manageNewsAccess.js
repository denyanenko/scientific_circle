const { News } = require('../models');
const {verifyMentorOrAdmin} = require('../utils/jwt');


async function manageNewsAccess(req, res, next, isAPI = false) {
    verifyMentorOrAdmin(req, res, async () => {
        const newsId = req.params.id;
        const userId = req.user.id;
        const userRole = req.user.role;
        try {
            const article = await News.findByPk(newsId);

            if (!article) {
                return isAPI
                    ? res.status(404).json({message: 'Новину не знайдено'})
                    : res.redirect(`/error.html?message=Новину не знайдено`);
            }

            // Авторизація: Ментор може редагувати тільки свої новини
            if (userRole === 'mentor' && article.authorId !== userId) {
                return isAPI
                    ? res.status(403).json({message: 'Доступ заборонено: ви не можете управляти цією новиною.'})
                    : res.redirect(`/error.html?message=Доступ заборонено: ви не можете управляти цією новиною.`);
            }

            if (isAPI) req.article = article
            return next();

        } catch (err) {
            console.error('❌ Помилка при перевірці доступу до новини:', err);
            return isAPI
                ? res.status(500).json({error: 'Внутрішня помилка сервера'})
                : res.redirect(`/error.html?message=Внутрішня помилка сервера`);
        }
    });

}

/**
 * Middleware для HTML (редірект на сторінку помилки)
 */
async function manageNewsAccessHtml(req, res, next) {
    await manageNewsAccess(req, res, next, false); // Для HTML передаємо false
}

/**
 * Middleware для API (JSON-відповідь)
 */
async function manageNewsAccessApi(req, res, next) {
    await manageNewsAccess(req, res, next, true); // Для API передаємо true
}

module.exports = {
    manageNewsAccessHtml,
    manageNewsAccessApi,
};
