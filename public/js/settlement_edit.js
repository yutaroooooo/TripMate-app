document.addEventListener('DOMContentLoaded', () => {
    const targetTypeSelect = document.getElementById('targetTypeSelect');
    const individualArea = document.getElementById('individualSelectArea');
    
    if (targetTypeSelect && individualArea) {
        targetTypeSelect.addEventListener('change', function() {
            individualArea.style.display = (this.value === 'individual') ? 'block' : 'none';
        });
    }

    const currencyInput = document.querySelector('input[name="currency"]');
    if (currencyInput) {
        currencyInput.addEventListener('input', function() {
            const val = this.value.trim();
            if (val.length > 3) {
                this.value = val.substring(0, 3).toUpperCase();
            }
        });
    }
});