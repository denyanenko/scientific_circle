const jwt = require('jsonwebtoken');
const { RefreshToken, User } = require('../models');
const { Op } = require('sequelize');

// Окрема функція для оновлення accessToken через refreshToken
async function refreshAccessToken(req, res, next) {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(403).json({ message: 'Не надано refresh token. Увійдіть до акаунту.' });
    }

    try {
        const decodedRefresh = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        const storedToken = await RefreshToken.findOne({ where: { token: refreshToken, userId: decodedRefresh.id } });
        if (!storedToken) return res.status(403).json({ message: 'Невідомий refresh token' });

        const user = await User.findByPk(decodedRefresh.id);
        if (!user) return res.status(404).json({ message: 'Користувача не знайдено' });

        const newAccessToken = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_ACCESS_SECRET,
            { expiresIn: '15m' }
        );

        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: true,
            maxAge: 15 * 60 * 1000 // 15 хв
        });

        req.user = { id: user.id, role: user.role };
        return next();
    } catch (err) {
        return res.status(403).json({ message: 'Невірний refresh token' });
    }
}

// Основна функція перевірки токена
async function verifyToken(req, res, next) {
    const accessToken = req.cookies.accessToken;

    if (!accessToken) {
        // Якщо немає accessToken — пробуємо оновити через refreshToken
        return refreshAccessToken(req, res, next);
    }

    jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET, async (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                // Якщо токен протух — пробуємо оновити через refreshToken
                return refreshAccessToken(req, res, next);
            } else {
                return res.status(401).json({ message: 'Невірний токен' });
            }
        } else {
            req.user = decoded;
            return next();
        }
    });
}


// Перевірка доступу для ментора
function verifyMentorToken(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== 'mentor') {
            return res.status(403).json({ message: 'Доступ лише для ментора' });
        }
        next();
    });
}

// Перевірка доступу для адміністратора
function verifyAdminToken(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Доступ лише для адміністратора' });
        }
        next();
    });
}
function verifyMentorOrAdmin(req, res, next) {
    verifyToken(req, res, () => {
        if (req.user.role !== 'mentor' && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Доступ лише для ментора або адміністратора' });
        }
        next();
    });
}

async function cleanExpiredRefreshTokens() {
    const now = new Date();
    const deleted = await RefreshToken.destroy({
        where: {
            expiresAt: { [Op.lt]: now }
        }
    });

    console.log(`Очищено ${deleted} прострочених refresh токенів`);
}

module.exports = {
    verifyToken,
    verifyMentorToken,
    verifyAdminToken,
    verifyMentorOrAdmin,
    cleanExpiredRefreshTokens
};
