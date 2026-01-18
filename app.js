const bcrypt = require('bcryptjs');
const express = require('express');
const sequelize = require('./config/database');
const User = require('./models/User');
const session = require('express-session');

const app = express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key-tripmate',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

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

        res.send('<h1>登録が完了しました！</h1><a href="/signup">戻る</a>');
    } catch (error) {
        console.error(error);
        res.send('<h1>エラーが発生しました</h1><p>そのメールアドレスは既に登録されている可能性があります。</p>');
    }
});

// ログイン画面を表示する
app.get('/login', (req, res) => {
    res.render('login');
});

// ログインの実行
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // 1. DBからメールアドレスでユーザーを検索
        const user = await User.findOne({ where: { email: email } });

        // 2. ユーザーが存在しない場合
        if (!user) {
            return res.send('<script>alert("メールアドレスまたはパスワードが間違っています"); history.back();</script>');
        }

        // 3. パスワードの照合 (入力されたPW と DBのハッシュ化PW を比較)
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            // セッションにユーザー情報を保存
            req.session.userId = user.id;
            req.session.username = user.username;

            // ログイン成功後に旅行一覧（トップページ）へリダイレクト
            res.redirect('/trips');
        } else {
            // パスワード不一致
            res.send('<script>alert("メールアドレスまたはパスワードが間違っています"); history.back();</script>');
        }
    } catch (error) {
        console.error(error);
        res.send('エラーが発生しました');
    }
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Database synced!');
  });
}).catch(err => {
  console.error('データベース接続エラー:', err);
});