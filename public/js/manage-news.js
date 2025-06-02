let offset = 0;
const limit = 9;
let loading = false;
let noMoreNews = false;
let newsToDeleteId = null;

const container = document.getElementById('news-container');
const loadingSpinner = document.getElementById('loading');
const noNewsMessage = document.getElementById('no-news-message');
const deleteNewsModal = new bootstrap.Modal(document.getElementById('deleteNewsModal'));
const newsTitleToDeleteSpan = document.getElementById('newsTitleToDelete');
const confirmDeleteNewsButton = document.getElementById('confirmDeleteNewsButton');


async function loadNews() {
    if (loading || noMoreNews) return;
    loading = true;
    loadingSpinner.classList.remove('d-none');

    try {
        const response = await fetch(`/api/news/editable?offset=${offset}&limit=${limit}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const news = await response.json();

        if (news.length === 0) {
            if (offset === 0) {
                noNewsMessage.classList.remove('d-none');
            }
            noMoreNews = true;
            loadingSpinner.classList.add('d-none');
            return;
        }

        news.forEach(article => {
            // Створюємо головний контейнер для картки новини
            const col = document.createElement('div');
            col.className = 'col-12 col-sm-6 col-md-4';
            col.dataset.articleId = article.id;

            // Створюємо картку
            const card = document.createElement('div');
            card.className = 'card shadow-sm h-100 news-card position-relative d-flex flex-column';

            // Створюємо посилання на новину з обкладинкою
            const newsLink = document.createElement('a');
            newsLink.href = `/news/${article.id}`;
            newsLink.className = 'text-decoration-none text-dark';

            const img = document.createElement('img');
            img.src = article.coverImage;
            img.className = 'card-img-top';
            img.style.maxHeight = '200px';
            img.style.objectFit = 'cover';
            img.alt = 'Обкладинка';
            newsLink.appendChild(img);

            // Створюємо тіло картки
            const cardBody = document.createElement('div');
            cardBody.className = 'card-body d-flex flex-column flex-grow-1';

            // Заголовок новини
            const title = document.createElement('h5');
            title.className = 'card-title mb-1';
            title.textContent = article.title;

            // Дата публікації
            const smallDate = document.createElement('small');
            smallDate.className = 'text-muted mb-2';
            const formattedDate = new Date(article.createdAt).toLocaleDateString('uk-UA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            smallDate.textContent = formattedDate;

            // Контейнер для кнопок
            const buttonContainer = document.createElement('div');
            buttonContainer.className = 'mt-auto d-flex justify-content-between';

            // Кнопка "Редагувати"
            const editButton = document.createElement('a');
            editButton.href = `/news/edit/${article.id}`;
            editButton.className = 'btn btn-sm btn-outline-primary';
            editButton.textContent = 'Редагувати';

            // Кнопка "Видалити"
            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn btn-sm btn-outline-danger delete-news-button';
            deleteButton.dataset.articleId = article.id;
            deleteButton.dataset.articleTitle = article.title;
            deleteButton.textContent = 'Видалити';

            // Додаємо обробник подій до кнопки "Видалити"
            deleteButton.addEventListener('click', handleDeleteButtonClick);

            // Збираємо все докупи
            buttonContainer.appendChild(editButton);
            buttonContainer.appendChild(deleteButton);

            cardBody.appendChild(title);
            cardBody.appendChild(smallDate);
            cardBody.appendChild(buttonContainer);

            card.appendChild(newsLink);
            card.appendChild(cardBody);

            col.appendChild(card);
            container.appendChild(col);
        });

        offset += limit;
    } catch (error) {
        console.error('Помилка при завантаженні новин:', error);
        showAlert(`Помилка при завантаженні новин: ${error.message}`, "danger");
    } finally {
        loading = false;
        loadingSpinner.classList.add('d-none');
    }
}

// Обробник кліку на кнопку "Видалити"
function handleDeleteButtonClick(event) {
    newsToDeleteId = event.target.dataset.articleId;
    const newsTitle = event.target.dataset.articleTitle;
    newsTitleToDeleteSpan.textContent = newsTitle;
    deleteNewsModal.show();
}

// Обробник кліку на кнопку підтвердження видалення у модальному вікні
confirmDeleteNewsButton.addEventListener('click', async () => {
    if (!newsToDeleteId) return;

    try {
        const response = await fetch(`/api/news/${newsToDeleteId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        const message = data?.message || 'Не вдалося видалити новину.';

        if (!response.ok) {
            throw new Error(message);
        }

        showAlert(message || "Новину успішно видалено!");

        // Видаляємо картку новини з DOM
        const deletedCard = document.querySelector(`.col-12[data-article-id="${newsToDeleteId}"]`);
        if (deletedCard) {
            deletedCard.remove();
            // Зменшуємо offset на 1, оскільки одна новина була видалена
            if (offset > 0) {
                offset--;
            }
        }


    } catch (error) {
        console.error('Помилка при видаленні новини:', error);
        showAlert(`Помилка при видаленні новини: ${error.message}`, "danger");
    } finally {
        newsToDeleteId = null;
        deleteNewsModal.hide();
    }
});

// Перший запуск
loadNews();

// Нескінченний скролл
window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom) {
        loadNews();
    }
});