require('dotenv').config({ path: __dirname + '/../.env' });
const { Sequelize } = require('sequelize');

// Підключення до бази даних PostgreSQL
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: 'localhost',
        dialect: 'postgres',
        port: 5432,
        logging: false,
        define: {
            timestamps: false,
            underscored: true
        },
    }
);

module.exports = sequelize;
