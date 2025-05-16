const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatRead = sequelize.define('ChatRead', {
    userId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    chatId: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        references: {
            model: 'chats',
            key: 'id',
        },
    },
    lastReadAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'chat_reads'
});

module.exports = ChatRead;