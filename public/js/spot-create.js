document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('mapSearchInput');
    const spotNameDisplay = document.getElementById('spotNameOutput');
    const addressDisplay = document.getElementById('addressOutput');

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const query = searchInput.value;
            
            console.log("検索クエリ:", query);
            
            spotNameDisplay.innerText = query;
            addressDisplay.innerText = "東京都中央区銀座 ◯-◯-◯";
            
            document.getElementById('spotNameInput').value = query;
            document.getElementById('addressInput').value = "東京都中央区銀座 ◯-◯-◯";
        }
    });
});