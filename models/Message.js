const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Message = sequelize.define('Message', {
    message: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    chatId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'chats',
            key: 'id',
        },
    },
    senderId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        },
        allowNull: true,
    },
    sentAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'messages',
});

module.exports = Message;