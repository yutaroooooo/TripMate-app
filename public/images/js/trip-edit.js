document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('imageInput');
    const imagePreview = document.getElementById('imagePreview');

    // 画像プレビュー機能
    if (imageInput) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => { imagePreview.src = e.target.result; };
                reader.readAsDataURL(file);
            }
        });
    }
});

// メンバー削除機能
function removeMember(memberId) {
    if (confirm('このメンバーを旅行から削除してもよろしいですか？')) {
        fetch(`/api/trip/${tripId}/member/${memberId}`, { method: 'DELETE' })
        console.log(`Removing member: ${memberId}`);
        alert('メンバーを削除しました（DB連携は次工程）');
        event.target.closest('.member-item').remove();
    }
}

// 多機能メンバー追加（名前・ID・メール検索）
async function searchAndAddMember() {
    const query = document.getElementById('memberSearchInput').value;
    if (!query) return alert('検索キーワードを入力してください');
    console.log(`Searching for: ${query}`);
    alert(`${query} を検索してメンバー候補を表示します（実装中）`);
}

// LINE招待機能
function inviteViaLine() {
    alert('LINEアプリを起動して招待リンクをシェアします（1/25実装予定）');
}