function confirmDelete(id) {
    if(confirm('投稿データを論理削除（del_flg=1）しますか？')) {
        console.log('Post ID ' + id + ' deleted logically.');
    }
}