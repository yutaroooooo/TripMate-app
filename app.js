const express = require('express');
const sequelize = require('./config/database');
const User = require('./models/User');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send('<h1>データベース接続テスト中...</h1>');
});

// サインアップ画面を表示する
app.get('/signup', (req, res) => {
    res.render('signup');
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Database synced!');
  });
}).catch(err => {
  console.error('データベース接続エラー:', err);
});