document.addEventListener('DOMContentLoaded', () => {
    
    //　AI解析実行ボタン（サーバーと通信してフォームを埋める）
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const text = document.getElementById('detailInput').value;
            if(!text) return alert("明細を入力してください");
            
            try {
                const response = await fetch('/api/analyze-receipt', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text: text })
                });
                
                if (!response.ok) throw new Error("解析に失敗しました");
                
                const data = await response.json();
                console.log("解析結果:", data);

                // 解析結果を各入力欄にセット
                if (data.title) document.querySelector('input[name="title"]').value = data.title;
                if (data.amount) document.querySelector('input[name="original_amount"]').value = data.amount;
                if (data.currency) {
                    const currencyInput = document.querySelector('input[name="currency"]');
                    currencyInput.value = data.currency;
                    currencyInput.dispatchEvent(new Event('input'));
                }

                alert("AI解析結果をフォームに反映しました！内容を確認して登録してください。");

            } catch (err) {
                console.error("解析エラー:", err);
                alert("解析中にエラーが発生しました。手動で入力してください。");
            }
        });
    }

    // 精算リマインドボタン（LINE通知）
    const remindBtn = document.getElementById('remindBtn');
    if (remindBtn) {remindBtn.addEventListener('click', () => {
        const summaryContainer = document.querySelector('.summary-box');
        const blocks = summaryContainer.querySelectorAll('.mb-3');
        
        if (blocks.length === 0) return alert("精算データが現在ありません");
        let message = "【TripMate精算通知】\n今回の旅行の精算結果です！\n----------------\n";
        blocks.forEach(block => {
            const textContent = block.innerText.trim().split('\n');
            if (textContent.length >= 2) {
                const nameLine = textContent[0];
                const amount = textContent[1];
                const names = nameLine.split(/[→\s]+/);
                const fromUser = names[0].trim();
                const toUser = names[names.length - 1].trim();
                
                message += `✅${fromUser}さんが\n👉${toUser}さんへ\n💸${amount}支払う\n`;
                message += "----------------\n";

}

});

        message += "内容を確認して精算を完了させてね！✨";

        const lineUrl = "https://line.me/R/msg/text/?" + encodeURIComponent(message);
        
        window.open(lineUrl, '_blank');
    });
}

    // 対象者選択（個別指定）の表示切り替え
    const targetTypeSelect = document.getElementById('targetTypeSelect');
    const individualArea = document.getElementById('individualSelectArea');
    
    if (targetTypeSelect && individualArea) {
        targetTypeSelect.addEventListener('change', function() {
            individualArea.style.display = (this.value === 'individual') ? 'block' : 'none';
        });
    }

    const currencyInput = document.querySelector('input[name="currency"]');
    if (currencyInput) {
        // changeイベントだと選択確定後なので、inputイベントの方がリアルタイムに反応します
        currencyInput.addEventListener('input', function() {
            const val = this.value.trim();
            // 候補（例: JPY 日本円 (JPY)）が選択された瞬間に3文字にカット
            if (val.length > 3) {
                this.value = val.substring(0, 3).toUpperCase();
            }
        });
    }
});

// 削除確認
function confirmDelete(settlementId) {
    if(confirm("この履歴を削除しますか？")) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/settlements/${settlementId}/delete`;
        document.body.appendChild(form);
        form.submit();
    }
}