const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chat = sequelize.define('Chat', {
    name: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('general', 'topic'),
        allowNull: false,
    },
    topicId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'topics',
            key: 'id',
        },
        allowNull: true,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'chats',
});

module.exports = Chat;