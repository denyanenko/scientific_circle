let email, role;

// Отримати токен з URL
const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

if (!token) {
    document.body.innerHTML = '<div class="container mt-5 alert alert-danger">⛔ Невірне або відсутнє запрошення.</div>';
    throw new Error('No token');
}

// Розшифрувати токен (локально лише payload)
try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    email = payload.email;
    role = payload.role;

    // Показати відповідні поля
    if (role === 'mentor') {
        document.getElementById('position-field').classList.remove('d-none');
        document.getElementById('position').required = true;
    }
} catch (e) {
    document.body.innerHTML = '<div class="container mt-5 alert alert-danger">⛔ Невалідний токен запрошення.</div>';
    throw new Error('Invalid token');
}

// Обробка відправки форми
document.getElementById('invite-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const data = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        patronymic: document.getElementById('patronymic').value.trim(),
        password: document.getElementById('password').value,
        token,
        additionalInfo: {}
    };

    if (role === 'mentor') {
        data.additionalInfo.position = document.getElementById('position').value.trim();
    }

    const res = await fetch('/register-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, token })
    });

    const msg = document.getElementById('invite-message');
    const result = await res.json();
    if (res.ok) {
        showAlert(`✅ ${result.message}`);
        document.getElementById('invite-form').reset();
    } else {
        showAlert(`❌ ${result.message}`,"danger");
    }
});