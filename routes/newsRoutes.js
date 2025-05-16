const express = require('express');
const router = express.Router();
const {News} = require('../models')
const path = require("path");
const {verifyAdminToken, verifyToken, verifyMentorOrAdmin} = require('../utils/jwt');
const multer = require('multer');
const {writeFileSync, existsSync, mkdirSync} = require("node:fs");

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


router.post('/save-article', verifyToken, upload.single('coverImage'), async (req, res) => {
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


router.post('/upload-image', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'Файл не було завантажено' });
    }

    const fileUrl = `/uploads/${req.file.filename}`; // Шлях, який потім підставляєш в <img src="">
    res.status(200).json({ url: fileUrl });
});


router.get('/api/news', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 9;
        const offset = parseInt(req.query.offset) || 0;

        const news = await News.findAll({
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

router.get('/news/:id', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'news-content.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});
// Отримати тільки title і contentHtml конкретної новини
router.get('/api/news/:id', async (req, res) => {
    const newsId = req.params.id;

    try {
        const article = await News.findByPk(newsId, {
            attributes: ['title', 'contentHtml']
        });

        if (!article) {
            return res.status(404).json({ message: 'Новина не знайдена' });
        }

        res.json(article);
    } catch (err) {
        console.error('Помилка при завантаженні новини:', err);
        res.status(500).json({ message: 'Помилка сервера' });
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