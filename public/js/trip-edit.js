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

/**
 * メンバーを画面から削除する
 * @param {string} memberId - メンバーの識別ID
 * @param {HTMLElement} btn - クリックされたボタン自身
 */
function removeMember(memberId, btn) {
    if (confirm('このメンバーを旅行から削除してもよろしいですか？')) {
        const memberItem = btn.closest('.member-item');
        if (memberItem) {
            memberItem.remove();
            console.log(`Removed member ID: ${memberId}`);
        }
    }
}

// 多機能メンバー追加（名前・ID・メール検索）
async function searchAndAddMember() {
    const input = document.getElementById('memberSearchInput');
    const memberList = document.getElementById('memberList');
    const query = input.value.trim();
    
    if (!query) return alert('名前またはメールアドレスを入力してください');

    try {
        // 1. サーバーにユーザーを探しに行く
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const users = await response.json();

        if (users.length === 0) {
            return alert('ユーザーが見つかりませんでした');
        }

        // 2. 最初に見つかったユーザーを確認して追加（本来はリストから選ばせるのが理想ですが、まずは1件目）
        const user = users[0];
        if (confirm(`「${user.username}」さんを追加しますか？`)) {
            const newMemberHtml = `
                <div class="text-center position-relative member-item" style="width: 75px;">
                    <button type="button" class="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center shadow-sm" 
                            style="width: 22px; height: 22px; transform: translate(5px, -5px);" 
                            onclick="removeMember('${user.id}', this)">
                        <i class="bi bi-x" style="font-size: 16px;"></i>
                    </button>
                    <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=random" class="rounded-circle border mb-1" style="width:50px; height:50px; object-fit:cover;">
                    <div class="small fw-bold text-truncate">${user.username}</div>
                    <input type="hidden" name="memberIds[]" value="${user.id}">
                </div>`;
                
            memberList.insertAdjacentHTML('beforeend', newMemberHtml);
            input.value = "";
        }
    } catch (error) {
        console.error("検索エラー:", error);
        alert("検索中にエラーが発生しました");
    }
}

// LINE招待機能
function inviteViaLine() {
    const shareUrl = encodeURIComponent(window.location.origin + "/signup");
    const text = encodeURIComponent("TripMateで一緒に旅行を計画しよう！\nこちらから参加してね：");
    window.open(`https://line.me/R/msg/text/?${text}${shareUrl}`, '_blank');
}