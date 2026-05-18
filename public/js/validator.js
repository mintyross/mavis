document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('.Login form');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        removeErrors();
        let isValid = true;

        // Поля, які є в обох формах
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        
        // Поля, які є лише у формі реєстрації (повернуть null на сторінці логіну)
        const usernameInput = document.getElementById('username');
        const passwordConfirmInput = document.getElementById('passwordConfirm');
        const avatarInput = document.getElementById('avatar');

        // 1. Валідація імені (тільки якщо поле є на сторінці)
        if (usernameInput && !usernameInput.value.trim()) {
            showError(usernameInput, 'Full Name is required');
            isValid = false;
        }

        // 2. Валідація Email (спільна)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailInput.value.trim()) {
            showError(emailInput, 'Email address is required');
            isValid = false;
        } else if (!emailRegex.test(emailInput.value.trim())) {
            showError(emailInput, 'Please enter a valid email address');
            isValid = false;
        }

        // 3. Валідація Пароля (спільна)
        if (!passwordInput.value) {
            showError(passwordInput, 'Password is required');
            isValid = false;
        } else if (passwordInput.value.length < 6) {
            showError(passwordInput, 'Password must be at least 6 characters long');
            isValid = false;
        }

        // 4. Валідація підтвердження пароля (тільки якщо поле є на сторінці)
        if (passwordConfirmInput) {
            if (!passwordConfirmInput.value) {
                showError(passwordConfirmInput, 'Please confirm your password');
                isValid = false;
            } else if (passwordInput.value !== passwordConfirmInput.value) {
                showError(passwordConfirmInput, 'Passwords do not match');
                isValid = false;
            }
        }

        // 5. Валідація Аватара (Оскільки він НЕОБОВ'ЯЗКОВИЙ — перевіряємо формат лише якщо файл обрано)
        if (avatarInput && avatarInput.files.length > 0) {
            const file = avatarInput.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            
            if (!allowedTypes.includes(file.type)) {
                showError(avatarInput, 'Only images are allowed (JPEG, PNG, WEBP, GIF)');
                isValid = false;
            }
        }

        // Якщо є помилки — зупиняємо відправку форми на сервер
        if (!isValid) {
            event.preventDefault();
        }
    });

    // Функція відображення помилки
    function showError(inputElement, message) {
        inputElement.style.borderColor = '#ff4d4d';
        inputElement.style.boxShadow = '0 0 5px rgba(255, 77, 77, 0.5)';

        const errorText = document.createElement('span');
        errorText.className = 'error-message';
        errorText.innerText = message;
        errorText.style.color = '#ff4d4d';
        errorText.style.fontSize = '0.85rem';
        errorText.style.display = 'block';
        errorText.style.gridColumn = '1 / -1'; /* Гарантує, що помилка займе весь рядок у вашій Grid-системі */
        errorText.style.margin = '5px 0 5px 25px';

        // Вставляємо помилку одразу після контейнера .input-group
        inputElement.closest('.input-group').after(errorText);
    }

    // Очищення стилів та текстів помилок
    function removeErrors() {
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.Login input').forEach(input => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });
    }
});
