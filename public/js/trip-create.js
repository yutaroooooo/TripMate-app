document.addEventListener('DOMContentLoaded', () => {
    const searchBtn = document.getElementById('searchBtn');
    const memberSearch = document.getElementById('memberSearch');
    const selectedMembersArea = document.getElementById('selectedMembers');

    searchBtn.addEventListener('click', searchAndAddMember);

    memberSearch.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchAndAddMember();
        }
    });

    async function searchAndAddMember() {
        const query = memberSearch.value.trim();
        if (!query) return;

        try {
            const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Network response was not ok');
            const users = await response.json();

            if (users.length === 0) {
                alert('ユーザーが見つかりませんでした');
                return;
            }

            const user = users[0];

            const existing = document.querySelector(`input[name="memberIds[]"][value="${user.id}"]`);
            if (existing) {
                alert('そのメンバーはすでに追加されています');
                return;
            }

            if (confirm(`「${user.username}」さんを追加しますか？`)) {
                addMemberItem(user.id, user.username, user.profile_image);
                memberSearch.value = '';
            }
        } catch (err) {
            console.error('検索エラー:', err);
            alert('検索中にエラーが発生しました');
        }
    }

    function addMemberItem(id, name, profile_image) {
        const avatarUrl = profile_image || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`;
        
        const memberHtml = `
            <div class="text-center position-relative member-item" style="width: 75px;">
                <button type="button" class="btn btn-danger btn-sm rounded-circle position-absolute top-0 end-0 p-0 d-flex align-items-center justify-content-center shadow-sm" 
                        style="width: 22px; height: 22px; transform: translate(5px, -5px); z-index: 10;" 
                        onclick="this.closest('.member-item').remove()">
                    <i class="bi bi-x" style="font-size: 16px;"></i>
                </button>
                <img src="${avatarUrl}" class="rounded-circle border mb-1" style="width:50px; height:50px; object-fit: cover;">
                <div class="small fw-bold text-truncate mb-1">${name}</div>
                <span class="badge bg-light text-dark border" style="font-size: 0.6rem;">招待</span>
                <input type="hidden" name="memberIds[]" value="${id}">
            </div>`;

        selectedMembersArea.insertAdjacentHTML('beforeend', memberHtml);
    }
});