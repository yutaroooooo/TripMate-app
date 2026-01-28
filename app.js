const bcrypt = require('bcryptjs');
const express = require('express');
const sequelize = require('./config/database');
const User = require('./models/User');
const Trip = require('./models/Trip');
const session = require('express-session');

User.hasMany(Trip, { foreignKey: 'userId' });
Trip.belongsTo(User, { foreignKey: 'userId' });

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

// パスワード再設定案内ページを表示する
app.get('/pwd_reset', (req, res) => {
    res.render('auth/pwd_reset');
});

// パスワード再設定フォームを表示
app.get('/pwd_form', (req, res) => {
    res.render('auth/pwd_form');
});

// パスワード再設定完了ページを表示
app.get('/pwd_comp', (req, res) => {
    res.render('auth/pwd_comp');
});

// ログアウト処理
app.get('/logout', (req, res) => {
    // セッションを破棄する
    req.session.destroy((err) => {
        if (err) {
            console.error('セッション破棄エラー:', err);
        }
        res.redirect('/login'); // ログイン画面へ戻す
    });
});

// 6. マイページ
app.get('/mypage', (req, res) => {
    const userData = {
        name: "yutaroooooo",
        profile_image: null,
        login_id: "yutaroooooo"
    };

    const userTrips = [
        { 
            id: 1, 
            title: "北海道卒業旅行", 
            start_date: "2026/02/10", 
            end_date: "2026/02/13" 
        },
        { 
            id: 2, 
            title: "週末の熱海温泉", 
            start_date: "2026/03/05", 
            end_date: "2026/03/06" 
        }
    ];

    res.render('mypage', { 
        user: userData, 
        trips: userTrips 
    });
});

// プロフィール編集画面
app.get('/user_profile_edit', (req, res) => {
    const userData = {
        name: "yutaroooooo",
        email: "example@mail.com",
        profile_image: null
    };
    res.render('user_profile_edit', { user: userData });
});

// 旅行一覧画面
app.get('/trips', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }

    try {
        // DBから自分が作成した旅行データをすべて取得
        const trips = await Trip.findAll({
            where: { 
                userId: req.session.userId,
                del_flg: 0 
            },
            order: [['createdAt', 'DESC']] // 新しい順に並べる
        });

        // EJSに旅行データ(trips)を渡す
        res.render('trips', { 
            username: req.session.username,
            trips: trips
        });
    } catch (error) {
        console.error(error);
        res.send('エラーが発生しました');
    }
});

// 新規旅行作成画面を表示
app.get('/trip_create', (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    res.render('trip_create', { username: req.session.username });
});

// 新規旅行作成の実行（DB保存）
app.post('/trip_create', async (req, res) => {
    const { title, start_date, end_date } = req.body;

    // ログイン中のユーザーIDをセッションから取得
    const userId = req.session.userId;

    try {
        // tripsテーブルにデータを新規登録
        await Trip.create({
            title: title,
            start_date: start_date,
            end_date: end_date,
            userId: userId, // 誰の旅行か紐付け
            del_flg: 0
        });

        // 保存後は旅行一覧画面へ戻る
        res.redirect('/trips');
    } catch (error) {
        console.error('旅行作成エラー:', error);
        res.send('<h1>旅行の作成に失敗しました</h1><a href="/trip_create">戻る</a>');
    }
});

//旅行詳細画面
app.get('/trip_detail/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    try {
        const trip = await Trip.findByPk(req.params.id);
        if (!trip || trip.userId !== req.session.userId) {
            return res.redirect('/trips');
        }
        res.render('trip_detail', { 
            username: req.session.username,
            trip: trip 
        });
    } catch (error) {
        console.error('詳細表示エラー:', error);
        res.status(500).send('エラーが発生しました');
    }
});

//旅行情報編集画面
app.get('/trip_edit/:id', async (req, res) => {
    const tripId = req.params.id;

    try {
        const trip = { id: tripId, title: "テスト旅行", start_date: "2026-01-21", end_date: "2026-01-25" }; 

        res.render('trip_edit', { 
            trip: trip, 
            username: req.session.username || "ゲストユーザー" 
        });
    } catch (error) {
        res.status(500).send("エラーが発生しました");
    }
});

//新規スポット追加画面
app.get('/trips/:trip_id/spots/create', (req, res) => {
    const loginUser = req.user || { name: "ゲストユーザー" }; 

    res.render('spot_create', { 
        trip: { id: req.params.trip_id },
        username: loginUser.name
    });
});

//予約・精算管理画面
app.get('/trips/:trip_id/settlement', (req, res) => {
    const user = req.user || { name: "ゲストユーザー" }; 

    const trip = { id: req.params.trip_id, title: "北海道卒業旅行" };

    const history = [
        { id: 1, title: "レンタカー代", amount: 12000, payer: user.name, target: "全員" },
        { id: 2, title: "昼食代", amount: 4500, payer: "メンバーA", target: "全員" }
    ];

    const summary = { from: "メンバーA", to: "あなた", total: 4500 };

    res.render('settlement', { 
        user,
        trip,
        history,
        summary
    });
});

//しおりPDFプレビュー画面
app.get('/trips/:trip_id/pdf_preview', (req, res) => {
    const user = req.user || { name: "ゲストユーザー" };
    const trip = { 
        id: req.params.trip_id, 
        title: "北海道卒業旅行",
        start_date: "2026/02/01",
        end_date: "2026/02/03"
    };

    res.render('trip_pdf_preview', { user, trip });
});

//管理者：投稿・スポット監視画面
app.get('/admin/monitoring', (req, res) => {
    const currentUser = req.user || { name: "管理者ユーザー", isAdmin: true };

    const posts = [
        { id: 101, user: "ユーザーA", content: "不適切な内容が含まれている可能性があります。", date: "2026/01/27 10:00" },
        { id: 102, user: "ユーザーB", content: "このスポットの画像が規約に抵触しているかもしれません。", date: "2026/01/27 09:45" }
    ];

    res.render('admin_monitoring', { 
        user: currentUser,
        posts: posts
    });
});

//投稿詳細確認
app.get('/admin/posts/:id', (req, res) => {
    const currentUser = req.user || { name: "管理者ユーザー", isAdmin: true };
    
    const post = { 
        id: req.params.id, 
        content: "通報対象となっている不適切な内容のサンプルテキストです。", 
        user_name: "ユーザーA", 
        created_at: "2026/01/27 10:00", 
        trip_title: "北海道卒業旅行", 
        spot_name: "札幌時計台" 
    };

    res.render('admin_post_detail', { 
        user: currentUser, 
        post: post 
    });
});

//管理者：ユーザー管理画面
app.get('/admin/users', (req, res) => {
    const currentUser = req.user || { name: "管理者ユーザー", isAdmin: true };
    
    const userList = [
        { id: 1, name: "ユーザーA", email: "userA@example.com", isActive: true },
        { id: 2, name: "ユーザーB", email: "userB@example.com", isActive: false },
        { id: 3, name: "ユーザーC", email: "userC@example.com", isActive: true }
    ];

    res.render('admin_users', { 
        user: currentUser,
        users: userList
    });
});

//ユーザー詳細
app.get('/admin/users/:id', (req, res) => {
    const currentUser = req.user || { name: "管理者ユーザー", isAdmin: true };
    
    const targetUser = { 
        id: req.params.id, 
        name: "ユーザーB", 
        email: "userB@example.com", 
        isActive: true 
    };

    res.render('admin_user_detail', { 
        user: currentUser, 
        targetUser: targetUser 
    });
});

//エラー画面
app.get('/error', (req, res) => {
    const user = req.user || null;
    
    res.render('error', {
        user: user,
        errorTitle: "404 Not Found",
        errorMessage: "お探しのページは見つかりませんでした。URLが間違っているか、削除された可能性があります。" // 仕様書②
    });
});

app.use((req, res) => {
    res.status(404).render('error', {
        user: req.user || null,
        errorTitle: "404 Not Found",
        errorMessage: "システムエラーが発生しました。お手数ですがトップからやり直して下さい"
    });
});

sequelize.sync().then(() => {
  app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log('Database synced!');
  });
}).catch(err => {
  console.error('データベース接続エラー:', err);
});