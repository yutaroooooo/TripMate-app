/**
 * 旅行プラン削除時の確認ダイアログ
 */
function confirmDelete() {
    if (confirm('この旅行プランを削除してもよろしいですか？（この操作は取り消せません）')) {
        alert('削除処理をシミュレートしました。');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Trip Detail Page Loaded.");
});