const bcrypt = require('bcryptjs');
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('./config/database');
const User = require('./models/User');
const Trip = require('./models/Trip');
const Spot = require('./models/Spot');
const Settlement = require('./models/Settlement');
const axios = require('axios'); // 為替レート取得用
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const line = require('@line/bot-sdk');
require('dotenv').config();

// --- LINE設定 ---
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

const client = new line.Client(lineConfig);

const LINE_LOGIN_ID = '2009030039'; 

const LINE_LOGIN_SECRET = process.env.LINE_LOGIN_SECRET;

const CALLBACK_URL = 'https://semiskilled-ute-trichoid.ngrok-free.dev/auth/line/callback';

User.hasMany(Trip, { foreignKey: 'userId' });
Trip.belongsTo(User, { foreignKey: 'userId' });
Trip.hasMany(Spot, { foreignKey: 'tripId' });
Spot.belongsTo(Trip, { foreignKey: 'tripId' });

const TripMember = sequelize.define('TripMember', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    }
});

Trip.belongsToMany(User, { through: TripMember, as: 'Members' });
User.belongsToMany(Trip, { through: TripMember });

Trip.belongsTo(User, { as: 'Owner', foreignKey: 'userId' }); 
User.hasMany(Trip, { foreignKey: 'userId' });

Trip.hasMany(Settlement, { foreignKey: 'tripId' });
Settlement.belongsTo(Trip, { foreignKey: 'tripId' });
Settlement.belongsTo(User, { as: 'Payer', foreignKey: 'payerId' }); // 支払った人

const app = express();
const port = 3000;
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
        cb(null, 'trip-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
    secret: 'secret-key-tripmate',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

const adminOnly = (req, res, next) => {
    const ADMIN_EMAIL = 'yutaro.onuki9816@gmail.com';
    
    if (req.session.userId && req.session.email === ADMIN_EMAIL) {
        next();
    } else {
        res.status(404).render('error', {
            user: req.session.username || null,
            errorTitle: "404 Not Found",
            errorMessage: "お探しのページは見つかりませんでした。"
        });
    }
};

async function getExchangeRate(fromCurrency) {
    if (!fromCurrency || fromCurrency === 'JPY') return 1;
    try {
        const response = await axios.get(`https://open.er-api.com/v6/latest/${fromCurrency}`);
        return response.data.rates.JPY; // 1外貨あたりの日本円
    } catch (error) {
        console.error("為替レート取得エラー:", error);
        return null;
    }
}

app.use((req, res, next) => {
    res.locals.username = req.session.username || null;
    res.locals.email = req.session.email || null;

    if (req.session.userId) {
        User.update(
            { last_active_at: new Date() },
            { where: { id: req.session.userId } }
        ).catch(err => console.error("アクティブ日時更新エラー:", err));
    }
    next();
});

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

        res.redirect('/login');
    } catch (error) {
        console.error(error);
        res.send('<script>alert("登録に失敗しました。既に登録されているメールアドレスの可能性があります。"); history.back();</script>');
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
        const user = await User.findOne({ where: { email: email, del_flg: 0 } });

        // 2. ユーザーが存在しない場合
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.send('<script>alert("メールアドレスまたはパスワードが間違っています"); history.back();</script>');
        }

        // 3. パスワードの照合 (入力されたPW と DBのハッシュ化PW を比較)
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.email = user.email;

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
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('セッション破棄エラー:', err);
        res.redirect('/login');
    });
});

// 6. マイページ
app.get('/mypage', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findByPk(req.session.userId);

        const userTrips = await Trip.findAll({
            include: [{
                model: User,
                as: 'Members',
                where: { id: req.session.userId },
                required: false
            }],
            where: {
                del_flg: 0,
                [Sequelize.Op.or]: [
                    { userId: req.session.userId },
                    { '$Members.id$': req.session.userId }
                ]
            },
            order: [['createdAt', 'DESC']]
        });

        res.render('mypage', { 
            user: { name: user.username, 
                    email: user.email, 
                    profile_image: user.profile_image,
                    line_user_id: user.line_user_id }, 
                    trips: userTrips,
                    email: user.email
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("マイページの読み込みに失敗しました");
    }
});

// プロフィール編集
app.get('/user_profile_edit', async (req, res) => {
    // ログインチェック
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.redirect('/login');

        res.render('user_profile_edit', { 
            user: {
                name: user.username,
                email: user.email,
                profile_image: user.profile_image
            },
            username: user.username
        });
    } catch (error) {
        console.error("Profile Edit View Error:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// プロフィール編集の保存実行
app.post('/user_profile_edit', upload.single('profile_image'), async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const user = await User.findByPk(req.session.userId);
        if (!user) return res.redirect('/login');

        const { name, email } = req.body;
        
        const updateData = {
            username: name,
            email: email,
            profile_image: user.profile_image
        };
        if (req.file) {
            updateData.profile_image = '/uploads/' + req.file.filename;
        }
        await user.update(updateData);
        req.session.username = name;
        req.session.email = email;
        res.send('<script>alert("プロフィールを更新しました！"); window.location.href="/mypage";</script>');
    } catch (error) {
        console.error("Profile Update Error:", error);
        res.status(500).send("プロフィールの更新に失敗しました");
    }
});

// --- LINE連携 ---

app.get('/auth/line', (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    const state = 'tripmate_' + Math.random().toString(36).substring(7);
    const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_LOGIN_ID}&redirect_uri=${encodeURIComponent(CALLBACK_URL)}&state=${state}&scope=openid%20profile`;
    
    res.redirect(lineAuthUrl);
});

app.get('/auth/line/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.redirect('/mypage');

    try {
        const response = await axios.post('https://api.line.me/oauth2/v2.1/token', 
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: CALLBACK_URL,
                client_id: LINE_LOGIN_ID,
                client_secret: LINE_LOGIN_SECRET
            }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const idToken = response.data.id_token;
        const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
        const lineUserId = payload.sub;

        await User.update(
            { line_user_id: lineUserId },
            { where: { id: req.session.userId } }
        );

        await client.pushMessage(lineUserId, {
            type: 'text',
            text: 'TripMateとの連携が完了しました！✨\n今後、精算やリマインドの通知をここでお届けします。'
        });

        res.render('line_link_success');
    } catch (error) {
        console.error("LINE連携エラー:", error.response?.data || error.message);
        res.status(500).send("LINE連携処理中にエラーが発生しました。");
    }
});

// 旅行一覧画面
app.get('/trips', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const trips = await Trip.findAll({
            include: [{ model: User, as: 'Owner' }, { model: User, as: 'Members' }],
            where: {
                del_flg: 0,
                [Sequelize.Op.or]: [{ userId: req.session.userId }, { '$Members.id$': req.session.userId }]
            },
            order: [['createdAt', 'DESC']],
            distinct: true
        });

        res.render('trips', { 
            trips: trips 
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
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

    // ログインしていない場合はログイン画面へリダイレクト
    if (!userId) {
        return res.redirect('/login');
    }

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
        res.status(500).send('<h1>旅行の作成に失敗しました</h1><a href="/trip_create">戻る</a>');
    }
});

//旅行詳細画面
app.get('/trip_detail/:id', async (req, res) => {
    if (!req.session.userId) {
        return res.redirect('/login');
    }
    try {
        const trip = await Trip.findByPk(req.params.id, {
            include: [{
                model: Spot,
                where: { del_flg: 0 },
                required: false
            },
            
            {
                model: User,
                as: 'Members',
                required: false
            }],

        order: [
            [Spot, 'visit_date', 'ASC'],
            [Spot, 'start_time', 'ASC']
        ]
    });

        if (!trip) {
            return res.redirect('/trips');
        }

        const isMember = trip.Members && trip.Members.some(m => m.id === req.session.userId);
        const isOwner = trip.userId === req.session.userId;

        if (!isOwner && !isMember) {
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

// スポットごとのメモ保存処理
app.post('/spots/:id/memo', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const spot = await Spot.findByPk(req.params.id);
        const userId = req.session.userId;
        const username = req.session.username;
        const newEntry = `${userId}|${username}|${req.body.memo}`;
        const updatedMemo = spot.memo ? `${spot.memo}\n${newEntry}` : newEntry;

        await spot.update({ memo: updatedMemo });
        res.redirect(`/trip_detail/${spot.tripId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send("保存に失敗しました");
    }
});

//旅行情報編集画面
app.get('/trip_edit/:id', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const trip = await Trip.findByPk(req.params.id, {
            include: [
                { model: User, as: 'Members' },
                { model: User, as: 'Owner' }
            ]
        });

        const isMember = trip.Members && trip.Members.some(m => m.id === req.session.userId);
        const isOwner = trip.userId === req.session.userId;

        if (!trip || (!isOwner && !isMember)) {
            return res.redirect('/trips');
        }
        res.render('trip_edit', { 
            trip: trip, 
            username: req.session.username,
            userId: req.session.userId 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("エラーが発生しました");
    }
});

// ユーザー検索API
app.get('/api/users/search', async (req, res) => {
    if (!req.session.userId) return res.status(401).send('Unauthorized');
    
    const query = req.query.q;
    try {
        const users = await User.findAll({
            where: {
                [Sequelize.Op.or]: [
                    { username: { [Sequelize.Op.like]: `%${query}%` } },
                    { email: { [Sequelize.Op.like]: `%${query}%` } }
                ],
                del_flg: 0
            },
            limit: 5
        });
        res.json(users);
    } catch (error) {
        console.error(error);
        res.status(500).json([]);
    }
});

// メンバーの削除
app.delete('/api/trip/:tripId/member/:memberId', async (req, res) => {
    if (!req.session.userId) return res.status(401).send('Unauthorized');
    res.json({ success: true });
});

// 旅行情報の更新実行
app.post('/trip_edit/:id', upload.single('image_file'), async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const tripId = req.params.id;
    const { title, start_date, end_date, memberIds, memo, items } = req.body;

    try {
        const trip = await Trip.findByPk(tripId, {
            include: [{ model: User, as: 'Members' }]
        });

        if (!trip) return res.redirect('/trips');

        // 権限：作成者本人 または 参加メンバーであること
        const isMember = trip.Members && trip.Members.some(m => m.id === req.session.userId);
        const isOwner = trip.userId === req.session.userId;

        if (!isOwner && !isMember) {
            return res.redirect('/trips');
        }

        // 基本情報の更新
        const updateData = { title, start_date, end_date, memo, items };
        if (req.file) {
            updateData.image_url = '/uploads/' + req.file.filename;
        }
        await trip.update(updateData);

        // メンバー情報の更新
        if (memberIds && Array.isArray(memberIds)) {
            await trip.setMembers(memberIds);
        } else {
            await trip.setMembers([]);
        }

        res.redirect(`/trip_detail/${tripId}`);
    } catch (error) {
        console.error("更新エラー:", error);
        res.status(500).send("更新に失敗しました");
    }
});

// スポット編集画面の表示
app.get('/spots/:id/edit', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const spot = await Spot.findByPk(req.params.id);
        if (!spot) return res.status(404).send('スポットが見つかりません');
        
        res.render('spot_edit', { 
            spot: spot,
            username: req.session.username 
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('エラーが発生しました');
    }
});

// スポット更新処理
app.post('/spots/:id/update', async (req, res) => {
    const { name, address, instagram_url, visit_date, start_time, end_time } = req.body;
    try {
        const spot = await Spot.findByPk(req.params.id);
        await spot.update({
            name: name,
            address: address,
            instagram_url: instagram_url,
            visit_date: visit_date,
            start_time: start_time,
            end_time: end_time
        });
        res.redirect(`/trip_detail/${spot.tripId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('更新に失敗しました');
    }
});

// 旅行の削除（論理削除）
app.post('/trips/:id/delete', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const trip = await Trip.findByPk(req.params.id, {
            include: [{ model: User, as: 'Members' }]
        });

        const isMember = trip.Members && trip.Members.some(m => m.id === req.session.userId);
        const isOwner = trip.userId === req.session.userId;

        if (!trip || (!isOwner && !isMember)) {
            return res.redirect('/trips');
        }

        await trip.update({ del_flg: 1 });
        res.redirect('/trips');
    } catch (err) {
        console.error(err);
        res.status(500).send('削除に失敗しました');
    }
});

// スポットの削除（論理削除）
app.post('/spots/:id/delete', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const spot = await Spot.findByPk(req.params.id);
        if (!spot) return res.status(404).send('スポットが見つかりません');

        await spot.update({ del_flg: 1 });

        const backURL = req.header('Referer') || `/trip_detail/${spot.tripId}`;
        
        if (backURL.includes('/admin/monitoring')) {
            return res.redirect('/admin/monitoring');
        }

        res.redirect(`/trip_detail/${spot.tripId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('削除に失敗しました');
    }
});

// スポットの復元（管理用）
app.post('/spots/:id/restore', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    
    try {
        const spot = await Spot.findByPk(req.params.id);
        if (!spot) return res.status(404).send('スポットが見つかりません');

        await spot.update({ del_flg: 0 });

        res.redirect('/admin/monitoring');
    } catch (err) {
        console.error(err);
        res.status(500).send('復元に失敗しました');
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

// スポットの保存
app.post('/trips/:id/spots', async (req, res) => {
    // どの旅行に対するスポットかIDを取得
    const tripId = req.params.id;
    const { name, address, instagram_url, visit_date, start_time, end_time } = req.body;

    try {
        // データベースの spots テーブルに保存
        await Spot.create({
            name: name,
            address: address,
            instagram_url: instagram_url,
            visit_date: visit_date,
            start_time: start_time,
            end_time: end_time,
            tripId: tripId,
            del_flg: 0
        });

        // 3. 保存後、その旅行の詳細画面に戻る
        res.redirect(`/trip_detail/${tripId}`);
    } catch (err) {
        console.error('スポット保存エラー:', err);
        res.status(500).send('スポットの保存に失敗しました');
    }
});

//予約・精算管理画面
app.get('/trips/:trip_id/settlement', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const tripId = req.params.trip_id;

    try {
        const trip = await Trip.findByPk(tripId, {
            include: [
                { model: User, as: 'Members' },
                { model: User, as: 'Owner' },
                { model: Settlement, include: [{ model: User, as: 'Payer' }] }
            ],

            order: [
                [{ model: Settlement }, 'created_at', 'DESC']
            ]
        });

        const settlements = trip.Settlements || [];
        const memberMap = new Map();
        memberMap.set(trip.Owner.id, trip.Owner);
        trip.Members.forEach(m => memberMap.set(m.id, m));

        const members = Array.from(memberMap.values());
        const memberCount = members.length;
        
        // --- 割り勘精算ロジック ---
        let summary = [];
        if (settlements.length > 0) {
            let balances = {}; // 各自の収支 (プラスなら貰う、マイナスなら払う)
            members.forEach(m => balances[m.id] = 0);

            // 各自の支払い合計を算出し、1人あたりの負担分を引く
            const totalAmount = settlements.reduce((sum, s) => sum + s.amount, 0);
            const sharePerPerson = totalAmount / memberCount;

            settlements.forEach(s => {
                balances[s.payerId] += s.amount;
                if (s.target_ids) {
                // --- 【個別指定】 ---
                const targetIds = JSON.parse(s.target_ids);
                const share = s.amount / targetIds.length;
                targetIds.forEach(id => {
                if (balances[id] !== undefined) balances[id] -= share;
              });
                } else {
                // --- 【全員均等】 ---
                const share = s.amount / memberCount;
                members.forEach(m => {
                balances[m.id] -= share;
                });
                 }
            });

            // 貰う人と払う人に分ける
            let creditors = [];
            let debtors = [];
            members.forEach(m => {
                let bal = balances[m.id];
                if (bal > 1) creditors.push({ id: m.id, name: m.username, amount: bal });
                else if (bal < -1) debtors.push({ id: m.id, name: m.username, amount: -bal });
            });

            // 相殺計算
            let c = 0, d = 0;
            while (c < creditors.length && d < debtors.length) {
                let payAmount = Math.min(creditors[c].amount, debtors[d].amount);
                summary.push({
                    from: debtors[d].name,
                    to: creditors[c].name,
                    total: Math.round(payAmount)
                });
                creditors[c].amount -= payAmount;
                debtors[d].amount -= payAmount;
                if (creditors[c].amount < 1) c++;
                if (debtors[d].amount < 1) d++;
            }
        }

        res.render('settlement', { 
            username: req.session.username,
            userId: req.session.userId,
            trip: trip,
            settlements: settlements,
            summaries: summary,
            members: members
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
    }
});

// 精算編集ボタン
app.get('/settlements/:id/edit', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const settlement = await Settlement.findByPk(req.params.id, {
            include: [{ model: Trip, include: [{ model: User, as: 'Members' }, { model: User, as: 'Owner' }] }]
        });
        if (!settlement) return res.redirect('/trips');

        res.render('settlement_edit', {
            username: req.session.username,
            settlement: settlement,
            trip: settlement.Trip
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('エラーが発生しました');
    }
});

// 精算更新の実行
app.post('/settlements/:id/update', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const { title, original_amount, currency, payerId, target_ids } = req.body;
    
    try {
        const settlement = await Settlement.findByPk(req.params.id);
        const rate = await getExchangeRate(currency); // 外貨ならレート再取得
        const jpyAmount = Math.round(original_amount * rate);

        await settlement.update({
            title,
            original_amount,
            currency,
            payerId,
            exchange_rate: rate,
            amount: jpyAmount,
            target_ids: target_ids ? JSON.stringify(target_ids) : null
        });

        res.redirect(`/trips/${settlement.tripId}/settlement`);
    } catch (error) {
        console.error(error);
        res.status(500).send('更新に失敗しました');
    }
});

// 精算削除ボタン
app.post('/settlements/:id/delete', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    try {
        const settlement = await Settlement.findByPk(req.params.id);
        if (!settlement) return res.redirect('/trips');

        const tripId = settlement.tripId;
        
        await settlement.destroy(); 
        
        res.redirect(`/trips/${tripId}/settlement`);
    } catch (error) {
        console.error("削除エラー:", error);
        res.status(500).send('削除に失敗しました');
    }
});

// 精算データの保存実行（外貨換算ロジック付き）
app.post('/trips/:trip_id/settlement', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');
    const tripId = req.params.trip_id;
    const { title, original_amount, currency, payerId, target_ids, raw_text } = req.body;

    try {
        const rate = await getExchangeRate(currency);
        const jpyAmount = Math.round(original_amount * rate);

        await Settlement.create({
            tripId: tripId,
            payerId: payerId,
            title: title,
            original_amount: original_amount,
            currency: currency,
            exchange_rate: rate,
            amount: jpyAmount,
            target_ids: target_ids ? JSON.stringify(target_ids) : null, // 配列を文字列で保存
            raw_text: raw_text || null,
            del_flg: 0
        });

        // --- LINE通知ロジック ---
        const trip = await Trip.findByPk(tripId, {
            include: [{ model: User, as: 'Members' }, { model: User, as: 'Owner' }]
        });
        const payer = await User.findByPk(payerId);

        const messageText = `💰【精算が登録されました】\n「${trip.title}」で新しい精算があります。\n\n内容：${title}\n金額：${jpyAmount.toLocaleString()}円\n支払者：${payer.username}さん\n\nアプリを開いて自分の精算分を確認しましょう！`;

const recipients = [trip.Owner, ...(trip.Members || [])];
        
        for (const user of recipients) {
            if (user.line_user_id) {
                await client.pushMessage(user.line_user_id, { type: 'text', text: messageText }).catch(e => console.error(e));
            }
        }

        res.redirect(`/trips/${tripId}/settlement`);
    } catch (error) {
        console.error("精算保存エラー:", error);
        res.status(500).send('保存に失敗しました');
    }
});

// しおりPDFプレビュー画面
app.get('/trips/:trip_id/pdf_preview', async (req, res) => {
    if (!req.session.userId) return res.redirect('/login');

    try {
        const trip = await Trip.findByPk(req.params.trip_id, {
            include: [{
                model: Spot,
                where: { del_flg: 0 },
                required: false
            }],
            order: [[Spot, 'start_time', 'ASC']]
        });

        if (!trip) {
            return res.redirect('/trips');
        }

        res.render('trip_pdf_preview', { 
            trip: trip,
            username: req.session.username 
        });
    } catch (error) {
        console.error("PDFプレビュー生成エラー:", error);
        res.status(500).send("しおりの生成中にエラーが発生しました");
    }
});

// AI解析エンドポイント
app.post('/api/analyze-receipt', async (req, res) => {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "テキストが空です" });

    // 初期値
    let data = { title: "明細からの自動入力", amount: 0, currency: "JPY" };

    // 金額の抽出（正規表現で「円」や「¥」の前の数字、あるいは単なる数字の塊を探す）
    // 例: "160,000" や "160000" にマッチ
    const amountMatch = text.replace(/,/g, '').match(/\d+/);
    if (amountMatch) {
        data.amount = parseInt(amountMatch[0], 10);
    }

    // 通貨の判定
    if (/JPY|円/.test(text)) data.currency = "JPY";
    else if (/KRW|ウォン/.test(text)) data.currency = "KRW";
    else if (/USD|ドル/.test(text)) data.currency = "USD";
    else if (/THB|バーツ/.test(text)) data.currency = "THB";
    else if (/EUR|ユーロ/.test(text)) data.currency = "EUR";
    else if (/TWD|台湾/.test(text)) data.currency = "TWD";
    else if (/VND|ドン/.test(text)) data.currency = "VND";

    // タイトルの簡易判定
    if (/ホテル|宿泊|宿|民泊|エアビ|エアビー/.test(text)) {
        data.title = "宿泊費";
    } else if (/レンタカー|カーシェア|ガソリン|給油|駐車場|パーキング/.test(text)) {
        data.title = "交通費（車）";
    } else if (/タクシー|Taxi|Uber|Grab/.test(text)) {
        data.title = "タクシー代";
    } else if (/新幹線|電車|切符|航空|飛行機|LCC|バス|運賃/.test(text)) {
        data.title = "交通費（公共機関）";
    } else if (/ご飯|飯|食|ランチ|ディナー|朝食|夕食|カフェ/.test(text)) {
        data.title = "食事代";
    } else if (/居酒屋|酒|ビール|飲み|バー|宴会/.test(text)) {
        data.title = "飲み代";
    } else if (/コンビニ|ローソン|セブン|ファミマ/.test(text)) {
        data.title = "コンビニ代";
    } else if (/入場|チケット|拝観|アクティビティ|体験/.test(text)) {
        data.title = "観光費";
    } else if (/土産|プレゼント|ギフト/.test(text)) {
        data.title = "お土産代";
    }

    res.json(data);
});

// 監視画面
app.get('/admin/monitoring', adminOnly, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 20;
        const offset = (page - 1) * limit;
        const status = req.query.status; // 'active', 'deleted', または undefined(すべて)

        let whereClause = {};
        if (status === 'active') whereClause.del_flg = 0;
        if (status === 'deleted') whereClause.del_flg = 1;

        const { count, rows } = await Spot.findAndCountAll({
            where: whereClause,
            include: [{
                model: Trip,
                include: [{ model: User, as: 'Owner', attributes: ['username', 'profile_image'] }]
            }],
            limit: limit,
            offset: offset,
            order: [['createdAt', 'DESC']]
        });

        res.render('admin_monitoring', { 
            user: { name: req.session.username, isAdmin: true },
            spots: rows,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            currentStatus: status || 'all'
        });
    } catch (error) {
        console.error("Monitoring Error:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// ユーザー管理一覧
app.get('/admin/users', adminOnly, async (req, res) => {
    try {
        const { search } = req.query; 
        let whereClause = {};

        if (search) {
            whereClause = {
                [Sequelize.Op.or]: [
                    { username: { [Sequelize.Op.like]: `%${search}%` } },
                    { email: { [Sequelize.Op.like]: `%${search}%` } }
                ]
            };
        }

        const userList = await User.findAll({
            where: whereClause,
            order: [['id', 'DESC']]
        });

        res.render('admin_users', { 
            user: { name: req.session.username, isAdmin: true },
            users: userList,
            searchQuery: search || ''
        });
    } catch (error) {
        console.error("User List Error:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// ユーザー詳細を表示する
app.get('/admin/users/:id', adminOnly, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.redirect('/admin/users');

        const tripCount = await Trip.count({ where: { userId: targetUser.id, del_flg: 0 } });
        const userTrips = await Trip.findAll({ where: { userId: targetUser.id }, attributes: ['id'] });
        const tripIds = userTrips.map(t => t.id);
        
        const spotCount = tripIds.length > 0 
            ? await Spot.count({ where: { tripId: tripIds, del_flg: 0 } }) 
            : 0;

        res.render('admin_user_detail', { 
            user: { name: req.session.username, isAdmin: true }, 
            targetUser: {
                id: targetUser.id,
                name: targetUser.username,
                email: targetUser.email,
                profile_image: targetUser.profile_image,
                isActive: targetUser.del_flg === 0
            },
            stats: {
                tripCount: tripCount,
                spotCount: spotCount,
                reportCount: 0
            }
        });
    } catch (error) {
        console.error("User Detail View Error:", error);
        res.status(500).send("エラーが発生しました");
    }
});

// 詳細画面からのステータス切り替え用
app.post('/admin/users/:id/toggle-status-detail', adminOnly, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.redirect('/admin/users');

        const newStatus = targetUser.del_flg === 0 ? 1 : 0;
        await targetUser.update({ del_flg: newStatus });

        res.redirect(`/admin/users/${req.params.id}`);
    } catch (error) {
        console.error(error);
        res.status(500).send("更新に失敗しました");
    }
});

// ユーザー詳細
app.post('/admin/users/:id/toggle-status', adminOnly, async (req, res) => {
    try {
        const targetUser = await User.findByPk(req.params.id);
        if (!targetUser) return res.status(404).json({ success: false });

        const newStatus = targetUser.del_flg === 0 ? 1 : 0;
        await targetUser.update({ del_flg: newStatus });

        res.json({ success: true, isDeleted: newStatus === 1 });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false });
    }
});

// 投稿詳細確認
app.get('/admin/posts/:id', adminOnly, async (req, res) => {
    try {
        const spot = await Spot.findByPk(req.params.id, {
            include: [{ model: Trip }]
        });
        
        if (!spot) return res.redirect('/admin/monitoring');

        res.render('admin_post_detail', { 
            user: { name: req.session.username, isAdmin: true }, 
            post: {
                id: spot.id,
                content: spot.address || "住所情報なし",
                user_name: "スポット登録",
                created_at: spot.createdAt.toLocaleString(),
                trip_title: spot.Trip ? spot.Trip.title : "不明な旅行",
                spot_name: spot.name
            } 
        });
    } catch (error) {
        res.status(500).send("エラーが発生しました");
    }
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

const cron = require('node-cron');

// 毎日朝 8:00 に実行
cron.schedule('0 8 * * *', async () => {
    console.log('定期リマインドチェック実行中...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const checkDays = [
        { days: 14, label: '2週間前' },
        { days: 7, label: '1週間前' },
        { days: 1, label: '前日' }
    ];

    try {
        for (const config of checkDays) {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + config.days);
            const dateString = targetDate.toISOString().split('T')[0];

            const trips = await Trip.findAll({
                where: { start_date: dateString, del_flg: 0 },
                include: [{ model: User, as: 'Members' }, { model: User, as: 'Owner' }]
            });

            for (const trip of trips) {
                let messageText = '';
                if (config.days === 1) {
                    messageText = `🔔【明日から旅行！】\nいよいよ明日は「${trip.title}」の出発日です！\n忘れ物はありませんか？準備を整えて楽しみましょう！🧳`;
                } else {
                    messageText = `📅【旅行の${config.label}です】\n「${trip.title}」まであと${config.label}になりました！\nそろそろ持ち物や予定を最終確認しませんか？✨`;
                }

                const recipients = [trip.Owner, ...(trip.Members || [])];
                for (const user of recipients) {
                    if (user.line_user_id) {
                        await client.pushMessage(user.line_user_id, { type: 'text', text: messageText }).catch(e => console.error(e));
                    }
                }
            }
        }
    } catch (error) {
        console.error('リマインド送信エラー:', error);
    }
});

sequelize.sync({}).then(() => {
    app.listen(port, () => {
      console.log(`Server is running at http://localhost:${port}`);
      console.log('Database synced and columns updated!');
    });
  }).catch(err => {
    console.error('データベース接続エラー:', err);
  });