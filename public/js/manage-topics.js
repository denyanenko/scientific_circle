let topicToArchiveId = null;

const container = document.getElementById('topics-container');
const loadingSpinner = document.getElementById('loading');
const noTopicsMessage = document.getElementById('no-topics-message');
const archiveTopicModal = new bootstrap.Modal(document.getElementById('archiveTopicModal'));
const topicTitleToArchiveSpan = document.getElementById('topicTitleToArchive');
const confirmArchiveTopicButton = document.getElementById('confirmArchiveTopicButton');


// Функція для завантаження гуртків
async function loadTopics() {
    loadingSpinner.classList.remove('d-none');
    container.innerHTML = ''; // Очищаємо контейнер перед завантаженням

    try {
        const response = await fetch('/api/topics/manageable');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const topics = await response.json();

        if (topics.length === 0) {
            noTopicsMessage.classList.remove('d-none');
        } else {
            noTopicsMessage.classList.add('d-none');
            topics.forEach(topic => {
                const col = document.createElement('div');
                col.className = 'col-12 col-sm-6 col-md-4';
                col.dataset.topicId = topic.id;

                const card = document.createElement('div');
                card.className = 'card shadow-sm h-100 topic-card d-flex flex-column';

                const cardBody = document.createElement('div');
                cardBody.className = 'card-body d-flex flex-column flex-grow-1';

                const title = document.createElement('h5');
                title.className = 'card-title mb-1';
                title.textContent = topic.title;

                const smallDate = document.createElement('small');
                smallDate.className = 'text-muted mb-2';
                const formattedDate = new Date(topic.createdAt).toLocaleDateString('uk-UA', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                smallDate.textContent = `Створено: ${formattedDate}`;

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'mt-auto d-flex justify-content-between';

                const editButton = document.createElement('a');
                editButton.href = `/topics/edit/${topic.id}`;
                editButton.className = 'btn btn-sm btn-outline-primary';
                editButton.textContent = 'Редагувати';

                const archiveButton = document.createElement('button');
                archiveButton.className = 'btn btn-sm btn-outline-warning archive-topic-button';
                archiveButton.dataset.topicId = topic.id;
                archiveButton.dataset.topicTitle = topic.title;
                archiveButton.textContent = 'Архівувати';

                archiveButton.addEventListener('click', handleArchiveButtonClick);

                buttonContainer.appendChild(editButton);
                buttonContainer.appendChild(archiveButton);

                cardBody.appendChild(title);
                cardBody.appendChild(smallDate);
                cardBody.appendChild(buttonContainer);

                card.appendChild(cardBody);
                col.appendChild(card);
                container.appendChild(col);
            });
        }
    } catch (error) {
        console.error('Помилка при завантаженні гуртків:', error);
        showAlert(`Помилка при завантаженні гуртків: ${error.message}`, "danger");
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

// Обробник кліку на кнопку "Архівувати"
function handleArchiveButtonClick(event) {
    topicToArchiveId = event.target.dataset.topicId;
    topicTitleToArchiveSpan.textContent = event.target.dataset.topicTitle;
    archiveTopicModal.show();
}

// Обробник кліку на кнопку підтвердження архівації у модальному вікні
confirmArchiveTopicButton.addEventListener('click', async () => {
    if (!topicToArchiveId) return;

    try {
        const response = await fetch(`/api/topics/archive/${topicToArchiveId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        const data = await response.json();
        const message = data?.message || 'Не вдалося архівувати гурток.';

        if (!response.ok) {
            throw new Error(message);
        }

        showAlert(message || "Гурток успішно архівовано!");

        // Видаляємо картку гуртка з DOM
        const archivedCard = document.querySelector(`.col-12[data-topic-id="${topicToArchiveId}"]`);
        if (archivedCard) {
            archivedCard.remove();
        }

        // Перевіряємо, чи залишилися гуртки, і якщо ні, показуємо повідомлення
        if (container.children.length === 0) {
            noTopicsMessage.classList.remove('d-none');
        }

    } catch (error) {
        console.error('Помилка при архівації гуртка:', error);
        showAlert(`Помилка при архівації гуртка: ${error.message}`, "danger");
    } finally {
        topicToArchiveId = null;
        archiveTopicModal.hide();
    }
});

// Перший запуск завантаження гуртків
document.addEventListener('DOMContentLoaded', async () => {
    const response = await fetch('/verifyAndRefresh', {
        method: 'POST',
        credentials: 'include'
    });

    const data = await response.json();
    if (data?.user?.role === 'admin') {
        showArchiveButton(); // Показати кнопку Архів
    }

    await loadTopics();
});

function showArchiveButton() {
    const archiveBtn = document.createElement('a');
    archiveBtn.href = '/archived-topics';
    archiveBtn.className = 'btn btn-outline-secondary ms-2';
    archiveBtn.textContent = '🗂 Архів';

    const buttonContainer = document.querySelector('.d-flex.justify-content-end.mb-4');
    buttonContainer.appendChild(archiveBtn);
}
