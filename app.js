const bcrypt = require('bcryptjs');
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

// サインアップの実行（登録ボタンが押された時の処理）
app.post('/signup', async (req, res) => {
    const { username, email, password, password_conf } = req.body;

    // 1. バリデーション：パスワードと確認用が一致するか
    if (password !== password_conf) {
        return res.send('<script>alert("パスワードが一致しません"); history.back();</script>');
    }

    try {
        // 2. パスワードを暗号化（ハッシュ化）する
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. データベース（usersテーブル）に保存
        await User.create({
            username: username,
            email: email,
            password: hashedPassword,
            del_flg: 0 // 0:有効
        });

        res.send('<h1>登録が完了しました！</h1><a href="/signup">戻</a>');
    } catch (error) {
        console.error(error);
        res.send('<h1>エラーが発生しました</h1><p>そのメールアドレスは既に登録されている可能性があります。</p>');
    }
});

// ログイン画面を表示する
app.get('/login', (req, res) => {
    res.render('login');
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Database synced!');
  });
}).catch(err => {
  console.error('データベース接続エラー:', err);
});