const express = require("express");
const path = require("path");
const {Topic,UserTopic, Chat, News} = require("../models");
const multer = require('multer');
const {verifyMentorOrAdmin, verifyToken, verifyAdminToken} = require("../utils/jwt");
const {literal, Op} = require("sequelize");
const {deleteFileFS, extractImagePaths} = require("../utils/fileUtils");
const {manageTopicAccessApi, manageTopicAccessHtml} = require("../utils/manageTopicsAccess");
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
            return res.status(404).json({ error: 'Гуртки не знайдено' });
        }

        res.json(topics);
    } catch (err) {
        console.error('Error fetching topics:', err);
        return res.status(500).json({ error: 'Помилка при отриманні гуртків з бази даних' });
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

        return res.status(201).json({ message: 'Гурток збережено', topicId: newTopic.id });
    } catch (err) {
        console.error('Помилка при збереженні гуртка:', err);
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


router.get('/api/topics/manageable', verifyMentorOrAdmin, async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const currentUserRole = req.user.role;

        let topics;

        const queryAttributes = ['id', 'title', 'createdAt'];
        const queryOrder = [['createdAt', 'DESC']];

        if (currentUserRole === 'admin') {
            // Адміністратор бачить усі активні гуртки
            topics = await Topic.findAll({
                where: { isActive: true },
                attributes: queryAttributes,
                order: queryOrder
            });
        } else { // currentUserRole === 'mentor'
            const mentorTopicEntries = await UserTopic.findAll({
                where: { userId: currentUserId},
                attributes: ['topicId']
            });

            const manageableTopicIds = mentorTopicEntries.map(ut => ut.topicId);

            if (manageableTopicIds.length === 0) {
                topics = [];
            } else {
                topics = await Topic.findAll({
                    where: {
                        id: { [Op.in]: manageableTopicIds },
                        isActive: true
                    },
                    attributes: queryAttributes,
                    order: queryOrder
                });
            }
        }

        res.json(topics);

    } catch (err) {
        console.error('Помилка при завантаженні гуртків для управління:', err.message, err.stack);
        res.status(500).json({ message: 'Помилка сервера при завантаженні гуртків для управління' });
    }
});

router.get('/manage-topics', verifyMentorOrAdmin, function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'manage-topics.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.patch('/api/topics/archive/:id', manageTopicAccessApi, async (req, res) => {
    const topic = req.topic;

    try {

        await topic.update({ isActive: false });
        return res.json({ message: 'Гурток успішно архівовано.' });
    } catch (err) {
        console.error('Помилка при архівуванні гуртка:', err);
        res.status(500).json({ message: 'Помилка сервера при архівуванні гурка' });
    }
});

router.get('/archived-topics', verifyAdminToken, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'private', 'archived-topics.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.get('/api/topics/archived', verifyAdminToken, async (req, res) => {
    try {
        const topics = await Topic.findAll({ where: { isActive: false } });

        if (topics.length === 0) {
            return res.status(404).json({ error: 'Архівованих гуртків не знайдено'});
        }

        res.json(topics);
    } catch (err) {
        console.error('Error fetching topics:', err);
        return res.status(500).json({ error: 'Помилка при отриманні архівованих гуртків з бази даних' });
    }
});

router.patch('/api/topics/restore/:id', verifyAdminToken, async (req, res) => {
    const topicId = req.params.id;

    try {
        const topic = await Topic.findByPk(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Гурток не знайдено' })
        }

        await topic.update({ isActive: true});
        return res.json({ message: 'Гурток успішно розархівовано.' });
    } catch (err) {
        console.error('Помилка при розархівуванні гуртка:', err);
        res.status(500).json({ message: 'Помилка сервера при розархівуванні гурка' });
    }
});

router.get('/api/topics/:id', async (req, res) => {
    const topicId = req.params.id;

    try {
        const topic = await Topic.findByPk(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Гурток не знайдено' })
        }

        return res.json(topic);

    } catch (err) {
        console.error('Помилка при завантаженні гуртка:', err);
        res.status(500).json({ message: 'Помилка сервера при завантаженні гуртка' });
    }
});

router.delete('/api/topics/:id', verifyAdminToken, async (req, res) => {
    const topicId = req.params.id;

    try {
        const topic = await Topic.findByPk(topicId);
        if (!topic) {
            return res.status(404).json({ message: 'Гурток не знайдено' })
        }
        if (topic.description) {
            const contentImagePaths = extractImagePaths(topic.description); // Отримуємо Set відносних шляхів
            await Promise.all(
                Array.from(contentImagePaths).map(relativePath => deleteFileFS(relativePath))
            );
        }

        await topic.destroy();
        return res.json({ message: 'Гурток успішно видалено.' });
    } catch (err) {
        console.error('Помилка при видаленні гуртка:', err);
        res.status(500).json({ message: 'Помилка сервера при видаленні гурка' });
    }
});

router.get('/topics/edit/:id', manageTopicAccessHtml,function (req, res) {
    res.sendFile(path.join(__dirname, '..', 'private', 'edit-topics.html'), (err) => {
        if(err){
            res.status(500).send("Internal server error");
        }
    });
});

router.delete('/api/topics/:id/users/:userId', manageTopicAccessApi, async (req, res) => {
    const { id: topicId, userId } = req.params;

    try {
        const link = await UserTopic.findOne({
            where: { topicId, userId }
        });

        if (!link) {
            return res.status(404).json({ message: 'Користувач не знайдений у цьому гуртку' });
        }

        await link.destroy();
        return res.status(200).json({ message: 'Користувача успішно видалено з гуртка' });

    } catch (error) {
        console.error('Помилка при видаленні користувача з гуртка:', error);
        return res.status(500).json({ message: 'Помилка сервера при видаленні користувача з гуртка' });
    }
});

router.get('/api/topics/:topicId/mentors', async (req, res) => {
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

router.get('/api/topics/:topicId/students', async (req, res) => {
    const { topicId } = req.params;

    try {
        const topic = await Topic.findByPk(topicId, { attributes: ['id'] });
        if (!topic) {
            return res.status(404).json({ error: 'Гурток не знайдено' });
        }

        const fullNameLiteral = literal(`CONCAT("last_name", ' ', "first_name", ' ', COALESCE("patronymic", ''))`);
        const students = await topic.getUsers({
            where: { role: 'student' },
            attributes: [
                'id',
                [fullNameLiteral, 'name']
            ],
            joinTableAttributes: [],
            order: [[fullNameLiteral, 'ASC']]
        });

        res.json(students);
    } catch (err) {
        console.error('Помилка при отриманні студентів:', err);
        res.status(500).json({ error: 'Помилка при отриманні студентів з бази даних' });
    }
});


router.put('/api/topics/:id', manageTopicAccessApi, async (req, res) => {
    const topicId = req.params.id;
    const { title, description, mentorIds } = req.body;
    const topic = req.topic;

    try {
        const fieldsToUpdate = {};

        // 1. Обробка заголовка
        if (title !== undefined && title !== topic.title) {
            fieldsToUpdate.title = title;
        }

        // 2. Обробка контенту та зображень
        if (description !== undefined && description !== topic.description) {
            fieldsToUpdate.description = description;

            const oldContentImagePaths = extractImagePaths(topic.description);
            const newContentImagePaths = extractImagePaths(description);

            for (const oldPath of oldContentImagePaths) {
                if (!newContentImagePaths.has(oldPath)) {
                    await deleteFileFS(oldPath);
                }
            }
        }

        // 3. Оновлюємо поля гуртка
        if (Object.keys(fieldsToUpdate).length > 0) {
            await topic.update(fieldsToUpdate);
        }

        // 4. Синхронізація менторів
        if (Array.isArray(mentorIds)) {
            // Отримуємо поточні ментори
            const currentMentors = await topic.getUsers({ attributes: ['id'] });
            const currentMentorIds = currentMentors.map(user => user.id);

            // Визначаємо, кого додати, а кого видалити
            const mentorsToAdd = mentorIds.filter(id => !currentMentorIds.includes(id));
            const mentorsToRemove = currentMentorIds.filter(id => !mentorIds.includes(id));

            if (mentorsToAdd.length > 0) {
                await topic.addUsers(mentorsToAdd);
            }
            if (mentorsToRemove.length > 0) {
                await topic.removeUsers(mentorsToRemove);
            }
        }

        const updatedTopic = await Topic.findByPk(topicId);

        res.json({ message: 'Гурток успішно оновлено', topic: updatedTopic });

    } catch (error) {
        console.error('Помилка при оновленні гуртка:', error);
        res.status(500).json({ message: 'Помилка сервера при оновленні гуртка' });
    }
});


module.exports = router;
