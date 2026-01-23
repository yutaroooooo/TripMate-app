document.addEventListener('DOMContentLoaded', () => {
    const imageInput = document.getElementById('profile_image');
    const imagePreview = document.getElementById('profilePreview');

    if (imageInput && imagePreview) {
        imageInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }
});