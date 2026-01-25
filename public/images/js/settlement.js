document.addEventListener('DOMContentLoaded', () => {
    // 解析実行ボタン
    document.getElementById('analyzeBtn').addEventListener('click', () => {
        const text = document.getElementById('detailInput').value;
        if(!text) return alert("明細を入力してください");
        
        console.log("AI解析中...");
        alert("AI解析（シミュレート）を実行しました。立替履歴に追加されます。");
    });

    // 精算リマインドボタン
    document.getElementById('remindBtn').addEventListener('click', () => {
        if(confirm("未精算者にLINE通知を送信しますか？")) {
            alert("LINE Messaging API経由で通知を送信しました。");
        }
    });
});

function confirmDelete() {
    if(confirm("この履歴を削除しますか？")) {
        alert("削除しました");
    }
}