const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const News = sequelize.define('News', {
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    contentHtml: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    coverImage: {
        type: DataTypes.TEXT
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    },
    authorId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'SET NULL',
    },
}, {
    tableName: 'news'
});

module.exports = News;
