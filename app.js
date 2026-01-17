const express = require('express');
const app = express();
const port = 3000;

// 画面の見た目（EJS）の設定
app.set('view engine', 'ejs');

// フォーム（入力欄）から送られてくるデータを受け取れるようにする
app.use(express.urlencoded({ extended: true }));

// 公開フォルダ（画像やCSS用）の設定
app.use(express.static('public'));

// 最初のテスト画面（ルートパス /）
app.get('/', (req, res) => {
  res.send('<h1>旅行アプリの開発準備が整いました！</h1>');
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});