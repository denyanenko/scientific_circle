const User = require('./User');
const Application = require('./Application');
const Topic = require('./Topic');
const UserTopic = require('./UserTopic');
const Chat = require('./Chat');
const Message = require('./Message');
const RefreshToken = require('./RefreshToken')
const News = require('./News')
const ChatRead = require('./СhatRead')

// Асоціації
User.belongsToMany(Topic, { through: UserTopic, foreignKey: 'userId', otherKey: 'topicId' });
Topic.belongsToMany(User, { through: UserTopic, foreignKey: 'topicId', otherKey: 'userId' });

Topic.hasOne(Chat, { foreignKey: 'topicId' });
Chat.belongsTo(Topic, { foreignKey: 'topicId' });

Message.belongsTo(Chat, { foreignKey: 'chatId' });
Chat.hasMany(Message, { foreignKey: 'chatId' });

Message.belongsTo(User, { foreignKey: 'senderId' });
User.hasMany(Message, { foreignKey: 'senderId' });

RefreshToken.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(RefreshToken, { foreignKey: 'userId' });

User.hasMany(News, { foreignKey: 'authorId' });
News.belongsTo(User, { foreignKey: 'authorId' });

User.hasMany(ChatRead, { foreignKey: 'userId' });
ChatRead.belongsTo(User, { foreignKey: 'userId' });

Chat.hasMany(ChatRead, { foreignKey: 'chatId' });
ChatRead.belongsTo(Chat, { foreignKey: 'chatId' });

module.exports = {
    User,
    Application,
    Topic,
    UserTopic,
    Chat,
    Message,
    RefreshToken,
    News,
    ChatRead
};