const form = document.getElementById('application-form');

// Обробник події на форму
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch('/apply', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            showAlert('Ваша заявка успішно надіслана! Відповідь буде надіслана на вашу пошту найближчим часом.', 'success');
            form.reset(); // Очищаємо форму після відправки
        } else {
            const err = await response.json();
            showAlert('Помилка: ' + (err.message || 'не вдалося надіслати заявку'), 'danger');
        }
    } catch (error) {
        showAlert('Сталася помилка при відправці заявки. Спробуйте пізніше.', 'danger');
        console.error(error);
    }
});


