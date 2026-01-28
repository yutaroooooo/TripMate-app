document.addEventListener('DOMContentLoaded', () => {
    const lineLinkBtn = document.getElementById('lineLinkBtn');

    if (lineLinkBtn) {
        lineLinkBtn.addEventListener('click', () => {
            console.log("LINE連携プロセスを開始します...");
            
            if (confirm("LINEアカウントと連携して通知を受け取りますか？")) {
                alert("LINE連携画面へ遷移します（API連携フェーズで実装）");
            }
        });
    }
});