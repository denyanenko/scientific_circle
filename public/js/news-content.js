const id = window.location.pathname.split('/').pop();

fetch(`/api/news/${id}`)
    .then(res => {
        if (!res.ok) {
            // Якщо новина не знайдена — змінюємо тільки заголовок
            document.getElementById('news-title').textContent = "Новину не знайдено";
            document.getElementById('news-content').innerHTML = ""; // очищаємо контент
            // Зупиняємо подальшу обробку
            throw new Error('Новину не знайдено');
        }
        return res.json();
    })
    .then(news => {
        document.getElementById('news-title').textContent = news.title;
        document.getElementById('news-content').innerHTML = news.contentHtml;
    })
    .catch(err => {
        // Тут можна залишити порожньо або щось для дебагу
        console.warn(err.message);
    });
