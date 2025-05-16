const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserTopic = sequelize.define('UserTopic', {
    userId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'users',
            key: 'id',
        },
        primaryKey: true,
    },
    topicId: {
        type: DataTypes.INTEGER,
        references: {
            model: 'topics',
            key: 'id',
        },
        primaryKey: true,
    },
    joinedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'user_topics',
});

module.exports = UserTopic;