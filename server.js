const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');

const applicationRoutes = require('./routes/applicationRoutes');
const topsisRoutes = require('./routes/topsisRoutes');
const topicRoutes  = require('./routes/topicRoutes');
const authRoutes = require('./routes/authRoutes')
const newsRoutes = require('./routes/newsRoutes')
const sequelize = require('./config/database');
const userRoutes = require('./routes/userRoutes')
const chatRoutes = require('./routes/chatRoutes')
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const {cleanExpiredRefreshTokens} = require('./utils/jwt');
const setupChatSocket = require('./sockets/setupChatSocket');


const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = 3000;


app.use(express.json());
app.use(cookieParser());

// Обслуговування статичних файлів
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', applicationRoutes);
app.use('/', topsisRoutes);
app.use('/', authRoutes);
app.use('/', topicRoutes);
app.use('/', newsRoutes);
app.use('/', userRoutes);
app.use('/', chatRoutes);


// Синхронізація з базою даних
sequelize.sync({ force: false })
    .then(() => console.log('Database connected'))
    .catch((error) => console.error('Error connecting to the database:', error));

cron.schedule('0 3 * * *', () => {
    console.log('[CRON] Чищення прострочених refresh токенів...');
    cleanExpiredRefreshTokens();
});

setupChatSocket(io);

server.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});

