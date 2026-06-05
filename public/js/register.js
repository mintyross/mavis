/* 
    Скрипт надсилає дані, вказані при реєстрації, на сервер, для створення акаунту.
*/
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    if (!signupForm) return;

    signupForm.addEventListener('submit', async (e) => {
        // Запобігаємо стандартній відправці, щоб зробити асинхронний fetch
        e.preventDefault(); 

        const password = document.getElementById('password').value;
        const formData = new FormData();
        
        formData.append('userName', document.getElementById('userName').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('password', password);
        
        const avatarInput = document.getElementById('avatar');
        if (avatarInput && avatarInput.files.length > 0) {
            formData.append('avatar', avatarInput.files[0]); 
        }

        try {
            const response = await fetch('/register', {
                method: 'POST',
                body: formData 
            });

            if (response.ok) {
                window.location.href = '/'; 
            } else {
                const error = await response.json().catch(() => ({}));
                alert(`Signup failed: ${error.message || 'Please try again.'}`);
            }
        } catch (err) {
            console.error('Registration error:', err);
            alert('Server error. Please try again later.');
        }
    });
});
