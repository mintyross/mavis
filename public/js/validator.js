/* 
    Скрипт для валідації даних сторінок /login та /register 
*/
document.addEventListener('DOMContentLoaded', () => {
    // Підтримка пошуку форми як за класом батьківського елемента, так і за ID
    const form = document.querySelector('.Login form') || document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', (event) => {
        removeErrors();
        let isValid = true;

        // Поля, які є в обох формах
        const emailInput = document.getElementById('email') || document.getElementById('userName');
        const passwordInput = document.getElementById('password');
        
        // Поля, які є лише у формі реєстрації
        const usernameInput = document.getElementById('userName');
        const passwordConfirmInput = document.getElementById('passwordConfirm');
        const avatarInput = document.getElementById('avatar');

        // Валідація Email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailInput) {
            const inputValue = emailInput.value.trim();
            if (!inputValue) {
                // Динамічний текст залежно від типу поля (Логін чи Реєстрація)
                const errorMsg = emailInput.id === 'userName' ? 'Username or Email is required' : 'Email address is required';
                showError(emailInput, errorMsg);
                isValid = false;
            } else if (emailInput.id === 'email' && !emailRegex.test(inputValue)) {
                showError(emailInput, 'Please enter a valid email address');
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

        // Валідація Аватара, якщо він обраний
        if (avatarInput && avatarInput.files.length > 0) {
            const file = avatarInput.files[0];
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            const allowedExtensions = /(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/i;
            
            // Перевірка типу за MIME-типом або за розширенням імені файлу
            if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
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
        
        // Створюємо об'єкт, для відображення тексту помилки
        const errorText = document.createElement('span'); 
        errorText.className = 'error-message';
        errorText.innerText = message;
        errorText.style.color = '#ff4d4d';
        errorText.style.fontSize = '0.85rem';
        errorText.style.display = 'block';
        errorText.style.gridColumn = '1 / -1';
        errorText.style.margin = '5px 0 5px 25px';

        // Вставляємо помилку одразу після контейнера .input-group
        const container = inputElement.closest('.input-group') || inputElement;
        container.after(errorText);
    }

    // Очищення стилів та текстів помилок
    function removeErrors() {
        document.querySelectorAll('.error-message').forEach(error => error.remove());
        document.querySelectorAll('.Login input, form input').forEach(input => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        });
    }
});
