document.getElementById('lineLinkBtn')?.addEventListener('click', () => {
    const confirmLink = confirm("LINEアカウントと連携して通知を受け取りますか？");
    if (confirmLink) {
        alert("LINE連携画面へ遷移します（API連携フェーズで実装予定）");
        window.location.href = '/mypage'; 
    }
});