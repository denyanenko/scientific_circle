const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Application = sequelize.define('Application', {
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
    studentGroup: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    applicationText: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    applicationDate: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'applications',
});

module.exports = Application;