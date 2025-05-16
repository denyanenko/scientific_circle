document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;

    try {
        const response = await fetch('/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email }),
        });

        const data = await response.json();
        showAlert(data.message || 'Перевірте пошту для подальших інструкцій');
    } catch (error) {
        console.error('Помилка відправки запиту:', error);
        showAlert('Сталася помилка. Спробуйте ще раз.');
    }
});


