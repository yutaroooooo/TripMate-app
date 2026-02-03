document.querySelectorAll('.form-check-input').forEach(switchEl => {
    switchEl.addEventListener('change', async function() {
        const userId = this.id.replace('switch', '');
        const label = this.nextElementSibling;

        try {
            const response = await fetch(`/admin/users/${userId}/toggle-status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();

            if (data.success) {
                label.textContent = data.isDeleted ? '停止中' : '有効';
            } else {
                alert('更新に失敗しました');
                this.checked = !this.checked;
            }
        } catch (error) {
            alert('通信エラーが発生しました');
            this.checked = !this.checked;
        }
    });
});