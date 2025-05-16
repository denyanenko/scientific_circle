document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Перевірка однаковості паролів
    if (newPassword !== confirmPassword) {
        showAlert('Паролі не співпадають. Будь ласка, введіть однакові паролі.', 'danger');
        return;
    }

    try {
        const response = await fetch('/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, password: newPassword }),
        });

        const data = await response.json();
        if (response.ok) {
            showAlert('Пароль змінено успішно! Тепер увійдіть.');
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 1500);
        } else {
            showAlert(data.message || 'Помилка при зміні пароля.', 'danger');
        }
    } catch (error) {
        console.error('Помилка відправки запиту:', error);
        showAlert('Сталася помилка. Спробуйте ще раз.', 'danger');
    }
});

