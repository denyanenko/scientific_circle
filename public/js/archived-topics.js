let topicToRestoreId = null;
let topicToDeleteId = null;

const container = document.getElementById('topics-container');
const loadingSpinner = document.getElementById('loading');
const noTopicsMessage = document.getElementById('no-topics-message');

const restoreModal = new bootstrap.Modal(document.getElementById('restoreTopicModal'));
const deleteModal = new bootstrap.Modal(document.getElementById('deleteTopicModal'));

const topicTitleToRestoreSpan = document.getElementById('topicTitleToRestore');
const topicTitleToDeleteSpan = document.getElementById('topicTitleToDelete');

const confirmRestoreTopicButton = document.getElementById('confirmRestoreTopicButton');
const confirmDeleteTopicButton = document.getElementById('confirmDeleteTopicButton');

async function loadArchivedTopics() {
    loadingSpinner.classList.remove('d-none');
    container.innerHTML = '';

    try {
        const response = await fetch('/api/topics/archived', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Не вдалося отримати архівовані гуртки.');

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
                smallDate.textContent = `Створено: ${new Date(topic.createdAt).toLocaleDateString('uk-UA')}`;

                const buttonContainer = document.createElement('div');
                buttonContainer.className = 'mt-auto d-flex justify-content-between';

                const restoreButton = document.createElement('button');
                restoreButton.className = 'btn btn-sm btn-outline-success';
                restoreButton.textContent = 'Розархівувати';
                restoreButton.addEventListener('click', () => {
                    topicToRestoreId = topic.id;
                    topicTitleToRestoreSpan.textContent = topic.title;
                    restoreModal.show();
                });

                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn btn-sm btn-outline-danger';
                deleteButton.textContent = 'Видалити';
                deleteButton.addEventListener('click', () => {
                    topicToDeleteId = topic.id;
                    topicTitleToDeleteSpan.textContent = topic.title;
                    deleteModal.show();
                });

                buttonContainer.appendChild(restoreButton);
                buttonContainer.appendChild(deleteButton);

                cardBody.appendChild(title);
                cardBody.appendChild(smallDate);
                cardBody.appendChild(buttonContainer);

                card.appendChild(cardBody);
                col.appendChild(card);
                container.appendChild(col);
            });
        }
    } catch (error) {
        console.error(error);
        showAlert(error.message, 'danger');
        noTopicsMessage.classList.remove('d-none');
    } finally {
        loadingSpinner.classList.add('d-none');
    }
}

// Розархівування
confirmRestoreTopicButton.addEventListener('click', async () => {
    if (!topicToRestoreId) return;

    try {
        const res = await fetch(`/api/topics/restore/${topicToRestoreId}`, {
            method: 'PATCH',
            credentials: 'include'
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result?.message || 'Помилка при розархівації');

        showAlert('Гурток розархівовано успішно!');
        document.querySelector(`[data-topic-id="${topicToRestoreId}"]`).remove();

    } catch (err) {
        showAlert(err.message, 'danger');
    } finally {
        topicToRestoreId = null;
        restoreModal.hide();
        if (container.children.length === 0) {
            noTopicsMessage.classList.remove('d-none');
        }
    }
});

// Видалення
confirmDeleteTopicButton.addEventListener('click', async () => {
    if (!topicToDeleteId) return;

    try {
        const res = await fetch(`/api/topics/${topicToDeleteId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const result = await res.json();
        if (!res.ok) throw new Error(result?.message || 'Помилка при видаленні');

        showAlert('Гурток повністю видалено.');
        document.querySelector(`[data-topic-id="${topicToDeleteId}"]`).remove();

    } catch (err) {
        showAlert(err.message, 'danger');
    } finally {
        topicToDeleteId = null;
        deleteModal.hide();
        if (container.children.length === 0) {
            noTopicsMessage.classList.remove('d-none');
        }
    }
});

document.addEventListener('DOMContentLoaded', loadArchivedTopics);
