const { Sequelize } = require('sequelize');

// パスワード'0106'
const sequelize = new Sequelize('travel_app_db', 'root', '0106', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false,
});

module.exports = sequelize;