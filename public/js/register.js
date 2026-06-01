/* 
    Скрипт надсилає дані, вказані при реєстрації, на сервер, для створення акаунту.
*/
document.getElementById('signupForm').addEventListener('submit', async (e) => {

    e.preventDefault(); 

    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;

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

        if (document.querySelectorAll('.error-message').length > 0) {
            e.preventDefault();
            return false; 
        }

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
