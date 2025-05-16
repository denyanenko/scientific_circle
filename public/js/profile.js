document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/profile', {
            credentials: 'include' // Додаємо щоб передавались куки!
        });

        if (!response.ok) throw new Error('Помилка отримання профілю');

        const user = await response.json();

        document.getElementById('firstName').textContent = user.firstName;
        document.getElementById('lastName').textContent = user.lastName;
        document.getElementById('patronymic').textContent = user.patronymic;
        document.getElementById('email').textContent = user.email;
        document.getElementById('role').textContent = translateRole(user.role);

        const additionalInfoContainer = document.getElementById('additional-info');
        if (user.role === 'student' && user.additionalInfo?.studentGroup) {
            additionalInfoContainer.innerHTML = `<p><strong>Група:</strong> ${user.additionalInfo.studentGroup}</p>`;
        } else if (user.role === 'mentor' && user.additionalInfo?.position) {
            additionalInfoContainer.innerHTML = `<p><strong>Посада:</strong> ${user.additionalInfo.position}</p>`;
        }
    } catch (error) {
        console.error(error);
        showAlert('Не вдалося завантажити профіль', 'danger');
    }
});

function translateRole(role) {
    switch (role) {
        case 'admin': return 'Адміністратор';
        case 'student': return 'Студент';
        case 'mentor': return 'Ментор';
        default: return role;
    }
}

// Обробники для зміни пошти і пароля
document.getElementById('change-email-btn').addEventListener('click', () => {
    const emailModal = new bootstrap.Modal(document.getElementById('changeEmailModal'));
    emailModal.show();
});

document.getElementById('change-password-btn').addEventListener('click', () => {
    const passwordModal = new bootstrap.Modal(document.getElementById('changePasswordModal'));
    passwordModal.show();
});


document.getElementById('saveEmailBtn').addEventListener('click', async () => {
    const newEmail = document.getElementById('newEmailInput').value.trim();
    const password = document.getElementById('password').value.trim();
    if (newEmail) {
        await updateEmail(newEmail, password);
        bootstrap.Modal.getInstance(document.getElementById('changeEmailModal')).hide();
    } else {
        showAlert('Будь ласка, введіть електронну пошту.', 'warning');
    }
});

document.getElementById('savePasswordBtn').addEventListener('click', async () => {
    const newPassword = document.getElementById('newPasswordInput').value.trim();
    if (newPassword) {
        await updatePassword(newPassword);
        bootstrap.Modal.getInstance(document.getElementById('changePasswordModal')).hide();
    } else {
        showAlert('Будь ласка, введіть новий пароль.', 'warning');
    }
});
async function updateEmail(newEmail, password) {
    try {
        const response = await fetch('/profile/change-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email: newEmail, password })
        });
        const result = await response.json();
        if (response.ok) {
            showAlert('Електронна пошта оновлена!');
            document.getElementById('email').textContent = newEmail;
        } else {
            showAlert(result.message || 'Помилка зміни пошти', 'danger');
        }
    } catch (error) {
        showAlert('Помилка зміни пошти', 'danger');
    }
}

async function updatePassword() {
    const oldPassword = document.getElementById('oldPasswordInput').value.trim();
    const newPassword = document.getElementById('newPasswordInput').value.trim();

    if (!oldPassword || !newPassword) {
        showAlert('Будь ласка, заповніть обидва поля.', 'warning');
        return;
    }

    try {
        const response = await fetch('/profile/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const result = await response.json();
        if (response.ok) {
            showAlert('Пароль успішно змінено!');
        } else {
            showAlert(result.message || 'Помилка зміни пароля', 'danger');
        }
    } catch (error) {
        showAlert('Помилка зміни пароля', 'danger');
    }
}


document.getElementById('delete-account-btn').addEventListener('click', () => {
    const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
    modal.show();
});

document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
    const password = document.getElementById('deletePasswordInput').value.trim();

    if (!password) {
        showAlert('Введіть пароль для підтвердження видалення акаунту.', 'warning');
        return;
    }

    try {
        const res = await fetch('/delete-account', {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const result = await res.json();

        if (res.ok) {
            showAlert('Акаунт успішно видалено!');
            setTimeout(() => {
                window.location.href = '/login'; // або головна
            }, 2000);
        } else {
            showAlert(result.message || 'Помилка при видаленні акаунту', 'danger');
        }
    } catch (err) {
        showAlert('Помилка при видаленні акаунту', 'danger');
    }
});


