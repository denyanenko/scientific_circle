// Вхід в систему
document.getElementById('login-form')?.addEventListener('submit', async function (e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // <-- дозволяє встановити куку з refreshToken
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            localStorage.setItem('accessToken', data.accessToken);
            window.location.href = '/'; // або куди завгодно
        } else {
            showAlert(data.message || 'Помилка входу',"danger");
        }
    } catch (err) {
        console.error('Login error:', err);
        showAlert('Щось пішло не так');
    }
});

