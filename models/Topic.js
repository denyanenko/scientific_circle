const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Topic = sequelize.define('Topic', {
    title: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'topics'
});

module.exports = Topic;