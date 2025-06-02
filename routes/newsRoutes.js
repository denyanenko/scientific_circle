const express = require('express');
const router = express.Router();
const {News} = require('../models')
const path = require("path");
const {verifyAdminToken, verifyToken, verifyMentorOrAdmin} = require('../utils/jwt');
const multer = require('multer');
const {existsSync, mkdirSync} = require("node:fs");
const {extractImagePaths, deleteFileFS}= require('../utils/fileUtils');
const {manageNewsAccessApi, manageNewsAccessHtml} = require('../utils/manageNewsAccess');

// Створити папку uploads, якщо її нема
const uploadPath = path.join(__dirname, '..', 'public', 'uploads');
if (!existsSync(uploadPath)) {
    mkdirSync(uploadPath);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fieldSize: 10 * 1024 * 1024 // 10MB
    }
});



router.get('/news', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'news.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/manage-news', verifyMentorOrAdmin, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'manage-news.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});


router.post('/save-article', verifyMentorOrAdmin, upload.single('coverImage'), async (req, res) => {
    try {
        let { title, contentHtml } = req.body;
        const authorId = req.user.id;
        const coverImageFile = req.file;

        const coverImageUrl = `/uploads/${coverImageFile.filename}`;

        const newArticle = await News.create({
            title,
            contentHtml,
            coverImage: coverImageUrl,
            authorId
        });

        return res.status(201).json({ message: 'Стаття створена', article: newArticle });
    } catch (err) {
        console.error('Помилка при збереженні статті:', err);
        return res.status(500).json({ message: 'Помилка сервера' });
    }
});


router.post('/upload-image', verifyToken, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не було завантажено' });
    }

    const fileUrl = `/uploads/${req.file.filename}`; // Шлях, в <img src="">
    res.status(200).json({ url: fileUrl });
});


router.get('/api/news', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 9;
        const offset = parseInt(req.query.offset) || 0;

        const news = await News.findAll({
            attributes: ['id', 'title', 'coverImage', 'createdAt', 'authorId'],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json(news);
    } catch (err) {
        console.error('Помилка при завантаженні новин:', err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.get('/api/news/editable', verifyMentorOrAdmin, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const offset = parseInt(req.query.offset) || 0;

        const userId = req.user.id;
        const userRole = req.user.role;

        let queryOptions = {
            attributes: ['id', 'title', 'coverImage', 'createdAt', 'authorId'],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        };

        // Якщо користувач - ментор, він бачить тільки свої новини
        if (userRole === 'mentor') {
            queryOptions.where = {
                authorId: userId
            };
        }

        const news = await News.findAll(queryOptions);

        res.json(news);

    } catch (err) {
        console.error('Помилка при завантаженні новин для редагування:', err.message);
        res.status(500).json({ message: 'Помилка сервера при завантаженні новин для редагування' });
    }
});

router.get('/news/:id', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'news-content.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/api/news/:id', async (req, res) => {
    const newsId = req.params.id;

    try {
        const article = await News.findByPk(newsId);

        if (!article) {
            return res.status(404).json({ message: 'Новина не знайдена' });
        }

        res.json(article);
    } catch (err) {
        console.error('Помилка при завантаженні новини:', err);
        res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.get('/news/edit/:id', manageNewsAccessHtml,function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'edit-news.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.put('/api/news/:id', manageNewsAccessApi,
    upload.single('coverImage'),
    async (req, res) => {
        const newsId = req.params.id;
        const { title, contentHtml } = req.body;
        const article = req.article;

        try {
            const currentCoverImagePath = article.coverImage; // Зберігаємо шлях до поточної обкладинки
            let newCoverImagePath = currentCoverImagePath;     // За замовчуванням залишаємо стару обкладинку

            const fieldsToUpdate = {};

            // 1. Обробка нової обкладинки (якщо завантажено)
            if (req.file) {
                newCoverImagePath = `/uploads/${req.file.filename}`;
                fieldsToUpdate.coverImage = newCoverImagePath;
                await deleteFileFS(currentCoverImagePath);

            }

            // 2. Обробка заголовка (якщо надійшов і відрізняється)
            if (title !== undefined && title !== article.title) {
                fieldsToUpdate.title = title;
            }

            // 3. Обробка контенту та пов'язаних зображень (якщо надійшов і відрізняється)
            if (contentHtml !== undefined && contentHtml !== article.contentHtml) {
                fieldsToUpdate.contentHtml = contentHtml; // Новий HTML-контент

                const oldContentImagePaths = extractImagePaths(article.contentHtml); // Зображення зі старого контенту в БД
                const newContentImagePaths = extractImagePaths(contentHtml);         // Зображення з нового контенту з запиту

                // Видаляємо зображення, які були в старому контенті, але немає в новому.
                for (const oldPath of oldContentImagePaths) {
                    if (!newContentImagePaths.has(oldPath)) {
                        await deleteFileFS(oldPath);
                    }
                }
            }

            // Оновлюємо тільки якщо є що оновлювати
            if (Object.keys(fieldsToUpdate).length > 0) {
               await article.update(fieldsToUpdate);
            }

            const updatedArticle = await News.findByPk(newsId); // Перечитуємо для актуальних даних

            res.json({ message: 'Новину успішно оновлено', article: updatedArticle });

        } catch (error) {
            console.error('Помилка при оновленні новини:', error);
            // Якщо нова обкладинка була завантажена multer'ом, але сталася помилка далі,
            // варто спробувати видалити цей щойно завантажений файл, щоб не залишати сміття.
            if (req.file) {
                await deleteFileFS(`/uploads/${req.file.filename}`);
            }
            res.status(500).json({ message: 'Помилка сервера при оновленні новини' });
        }
    }
);

router.delete('/api/news/:id', manageNewsAccessApi, async (req, res) => {
    const article = req.article;

    try {
        // Видалення обкладинки
        if (article.coverImage) {
            await deleteFileFS(article.coverImage);
        }

        // Видалення зображень зі статті
        if (article.contentHtml) {
            const contentImagePaths = extractImagePaths(article.contentHtml); // Отримуємо Set відносних шляхів
            await Promise.all(
                Array.from(contentImagePaths).map(relativePath => deleteFileFS(relativePath))
            );
        }

        // Видаляємо з бази
        await article.destroy();

        res.status(200).json({ message: 'Новина успішно видалена' });
    } catch (err) {
        console.error('Помилка при видаленні новини:', err);
        res.status(500).json({ message: 'Помилка сервера при видаленні новини' });
    }
});

router.get('/create-news', verifyMentorOrAdmin, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'create-news.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});




module.exports = router;