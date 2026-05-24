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

        if (response.ok) {
            //alert('Login successful! Redirecting...');
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