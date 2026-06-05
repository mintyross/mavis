/* 
    Скрипт для валідації даних сторінок /login та /register 
*/
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.Login form') || document.getElementById('loginForm') || document.getElementById('signupForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        removeErrors();
        let isValid = true;

        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const usernameInput = document.getElementById('userName');
        const passwordConfirmInput = document.getElementById('passwordConfirm');
        const avatarInput = document.getElementById('avatar');

        // Валідація Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailInput) {
            const inputValue = emailInput.value.trim();
            if (!inputValue) {
                showError(emailInput, 'Email is required');
                isValid = false;
            } else if (!emailRegex.test(inputValue)) {
                showError(emailInput, 'Please enter a valid email address');
                isValid = false;
            }
        }

        if (usernameInput) {
            const inputValue = usernameInput.value.trim();
            if (!inputValue) {
                showError(usernameInput, 'User name is required');
                isValid = false;
            }
        }

        // Валідація Пароля
        if (passwordInput) {
            if (!passwordInput.value) {
                showError(passwordInput, 'Password is required');
                isValid = false;
            } else if (passwordInput.value.length < 6) {
                showError(passwordInput, 'Password must be at least 6 characters long');
                isValid = false;
            }
        }

        // Валідація підтвердження пароля
        if (passwordConfirmInput && passwordInput) {
            if (!passwordConfirmInput.value) {
                showError(passwordConfirmInput, 'Please confirm your password');
                isValid = false;
            } else if (passwordInput.value !== passwordConfirmInput.value) {
                showError(passwordConfirmInput, 'Passwords do not match');
                isValid = false;
            }
        }

        // Валідація Аватара
        if (avatarInput && avatarInput.files.length > 0) {
            const file = avatarInput.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            const allowedExtensions = /(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/i;
            
            if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
                showError(avatarInput, 'Only images are allowed (JPEG, PNG, WEBP, GIF)');
                isValid = false;
            }
        }

        // ЯКЩО ФОРМА НЕВАЛІДНА:
        if (!isValid) {
            event.preventDefault();
            // Зупиняє виконання всіх наступних обробників (включаючи fetch у register.js)
            event.stopImmediatePropagation(); 
        }
    });

    function showError(inputElement, message) {
        inputElement.style.borderColor = '#ff4d4d';
        inputElement.style.boxShadow = '0 0 5px rgba(255, 77, 77, 0.5)';
        
        const errorText = document.createElement('span'); 
        errorText.className = 'error-message';
        errorText.innerText = message;
        errorText.style.color = '#ff4d4d';
        errorText.style.fontSize = '0.85rem';
        errorText.style.display = 'block';
        errorText.style.gridColumn = '1 / -1';
        errorText.style.margin = '5px 0 5px 25px';

        const container = inputElement.closest('.input-group') || inputElement;
        container.after(errorText);
    }

    function removeErrors() {
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.Login input, form input').forEach(input => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });
    }
});
    