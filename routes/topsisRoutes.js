const express = require('express');
const {topsis} = require("../utils/topsis");
const router = express.Router();

// Прийом матриці оцінок
router.post('/api/matrix', (req, res) => {
    const { matrix, weights, isMaxCriteria } = req.body;

    if (!matrix || !weights ||!isMaxCriteria) {
        return res.status(400).json({ error: 'Неправильний формат даних' });
    }
    const topicsRange = topsis(matrix, weights, isMaxCriteria)

    res.json({
        message: 'Дані успішно отримано',
        topicsRange: topicsRange // Передаємо ранжування тем
    });
});
module.exports = router;