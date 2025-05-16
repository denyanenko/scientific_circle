const express = require("express");
const path = require("path");
const {Topic,UserTopic, Chat} = require("../models");
const multer = require('multer');
const {verifyMentorOrAdmin, verifyToken} = require("../utils/jwt");
const {literal, Op} = require("sequelize");
const router = express.Router();

router.get('/topics', function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'public', 'topics.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});
router.get('/join-topic', verifyToken, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'join-topic.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/my-topics', verifyToken, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'user-topics.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/api/topics', async (req, res) => {
    try {
        const topics = await Topic.findAll({ where: { isActive: true } });

        if (topics.length === 0) {
            return res.status(404).json({ error: 'Тем не знайдено' });
        }

        res.json(topics);
    } catch (err) {
        console.error('Error fetching topics:', err);
        return res.status(500).json({ error: 'Помилка при отриманні тем з бази даних' });
    }
});

router.get('/create-topic', verifyMentorOrAdmin, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'create-topic.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.post('/save-topic', verifyMentorOrAdmin, async (req, res) => {
    const { title, contentHtml, mentorIds } = req.body;

    if (!title || !contentHtml || !Array.isArray(mentorIds)) {
        return res.status(400).json({ message: 'Неправильні дані' });
    }

    try {
        // 1. Створення теми
        const newTopic = await Topic.create({
            title,
            description: contentHtml,
        });

        await newTopic.addUsers(mentorIds);

        return res.status(201).json({ message: 'Тему збережено', topicId: newTopic.id });
    } catch (err) {
        console.error('Помилка при збереженні теми:', err);
        return res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.get('/topics-not-joined', verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const userTopics = await UserTopic.findAll({
            where: { userId },
            attributes: ['topicId']
        });
        const joinedTopicIds = userTopics.map(ut => ut.topicId);

        const topics = await Topic.findAll({
            where: {
                isActive: true,
                id: { [Op.notIn]: joinedTopicIds }
            },
            attributes: ['id', 'title']
        });

        if (topics.length === 0) {
            return res.status(404).json({ error: 'Немає доступних гуртків для приєднання' });
        }

        res.json(topics);
    } catch (err) {
        console.error('Помилка при отриманні гуртків:', err);
        return res.status(500).json({ error: 'Помилка при отриманні гуртків з бази даних' });
    }
});

router.get('/topics-joined', verifyToken, async (req, res) => {
    const userId = req.user.id;

    try {
        const userTopics = await UserTopic.findAll({
            where: { userId },
            attributes: ['topicId']
        });
        const joinedTopicIds = userTopics.map(ut => ut.topicId);

        const topics = await Topic.findAll({
            where: {
                isActive: true,
                id: { [Op.in]: joinedTopicIds }
            },
            attributes: ['id', 'title']
        });

        if (topics.length === 0) {
            return res.status(404).json({ error: 'Ви ще не приєдналися до жодного гуртка' });
        }

        res.json(topics);
    } catch (err) {
        console.error('Помилка при отриманні гуртків:', err);
        return res.status(500).json({ error: 'Помилка при отриманні гуртків з бази даних' });
    }
});

router.post('/join-topic', verifyToken, async (req, res) => {
    const { topicId } = req.body;
    const userId = req.user.id;

    try {
        const [record, created] = await UserTopic.findOrCreate({
            where: { userId, topicId }
        });

        if (!created) {
            return res.status(409).json({ message: 'Користувач вже приєднаний до гуртка' });
        }

        return res.status(201).json({ message: 'Користувач приєднався до гуртка', topicId });
    } catch (err) {
        console.error('Помилка приєднання до гуртка:', err);
        return res.status(500).json({ message: 'Помилка сервера' });
    }
});

router.post('/leave-topic', verifyToken, async (req, res) => {
    const { topicId } = req.body;
    const userId = req.user.id;

    try {
        const deletedCount = await UserTopic.destroy({
            where: { userId, topicId }
        });

        if (deletedCount === 0) {
            return res.status(404).json({ message: 'Користувач не приєднаний до гуртка' });
        }

        return res.status(200).json({ message: 'Користувач вийшов з гуртка', topicId });
    } catch (err) {
        console.error('Помилка виходу з гуртка:', err);
        return res.status(500).json({ message: 'Помилка сервера' });
    }
});







module.exports = router;
