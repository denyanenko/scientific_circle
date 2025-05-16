const {DataTypes} = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
    firstName: {
        type: DataTypes.TEXT,
    },
    lastName: {
        type: DataTypes.TEXT,
    },
    patronymic: {
        type: DataTypes.TEXT,
    },
    email: {
        type: DataTypes.TEXT,
        unique: true,
        allowNull: false,
    },
    password: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('student', 'mentor', 'admin'),
        allowNull: false,
    },
    additionalInfo: {
        type: DataTypes.JSONB,
    },
    createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },

}, {
    tableName: 'users'
});

module.exports = User;