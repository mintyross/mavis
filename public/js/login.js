/* Скрипт створений для сторінки /login надсилає дані до серверу при натисканні на кнопку входу до аккауну
   Він також виконує перевірку: якщо існує помилка, то скрипт зупиняється,
   якщо немає помилок - виконує перенаправлення на головну сторінку / 
*/

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('userName').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        if (document.querySelectorAll('.error-message').length > 0) {
            e.preventDefault();
            return false; 
        }

        if (response.ok) {
            window.location.href = '/';
        } else {
            const errorData = await response.json().catch(() => ({}));
            alert(errorData.message || 'Login failed. Please check your credentials.');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        alert('Server is unavailable. Please try again later.');
    }
});