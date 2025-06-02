document.addEventListener('DOMContentLoaded', async () => {
    await loadTopics();
});

let topicsListCache = []; // Кеш тем/гуртків

async function loadTopics() {
    if (topicsListCache.length > 0) return;

    try {
        const response = await fetch('/topics-joined', { credentials: 'include' });

        if (!response.ok) {
            throw new Error('Немає доступних гуртків для приєднання');
        }

        const topics = await response.json();
        // Завантажити менторів для кожної теми
        const topicsWithMentors = await Promise.all(topics.map(async (topic) => {
            const [mentorsResponse, chatResponse] = await Promise.all([
                fetch(`/api/topics/${topic.id}/mentors `, { credentials: 'include' }),
                fetch(`/topics/${topic.id}/chat`, { credentials: 'include' }) // отримує chatId
            ]);

            const mentors = await mentorsResponse.json();
            const chatData = await chatResponse.json();

            let unreadCount = 0;
            try {
                const unreadRes = await fetch(`/api/chat/${chatData.chatId}/unread-count`, { credentials: 'include' });
                const unreadData = await unreadRes.json();
                unreadCount = unreadData.unreadCount || 0;
            } catch (err) {
                console.warn(`Не вдалося завантажити кількість непрочитаних повідомлень для topicId=${topic.id}`);
            }

            return {
                ...topic,
                mentors: mentors || [],
                chatId: chatData.chatId,
                unreadCount
            };
        }));

        topicsListCache = topicsWithMentors;
        updateTopicsList();
    } catch (error) {
        console.error('Помилка завантаження гуртків або менторів:', error);
        updateTopicsList();
    }
}


function updateTopicsList() {
    const topicsListElement = document.getElementById('topics-list');
    topicsListElement.innerHTML = ""; // Очищаємо список перед оновленням

    if (topicsListCache.length === 0) {
        const message = document.createElement('p');
        message.textContent = "Ви не вступили в жоден з гуртків";
        message.classList.add('text-center', 'text-secondary', 'mt-5', 'fs-4', 'fw-semibold');
        topicsListElement.appendChild(message);
        return;
    }

    topicsListCache.forEach(async (topic) => {
        const card = document.createElement('div');
        card.classList.add('card', 'mb-4', 'shadow-sm');

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const title = document.createElement('h5');
        title.classList.add('card-title');
        title.textContent = topic.title;

        const mentorsDiv = document.createElement('p');
        let mentorsText = '';
        if (topic.mentors.length > 0) {
            const mentorNames = topic.mentors.map(mentor => mentor.name).join(', ');
            const label = topic.mentors.length === 1 ? 'Ментор гуртка' : 'Ментори гуртка';
            mentorsText = `<strong>${label}:</strong> ${mentorNames}`;
        } else {
            mentorsText = `<em>Менторів не обрано</em>`;
        }
        mentorsDiv.innerHTML = mentorsText;

        const chatButton = document.createElement('button');
        chatButton.textContent = 'Чат гуртка';
        chatButton.classList.add('btn', 'btn-outline-primary', "position-relative", 'me-4');
        chatButton.dataset.chatId = topic.chatId;
        chatButton.dataset.unreadCount = topic.unreadCount;
        if (topic.unreadCount > 0) {
            const badge = document.createElement('span');
            badge.classList.add('position-absolute', 'top-0', 'start-100', 'translate-middle', 'badge', 'rounded-pill', 'bg-danger');
            badge.textContent = topic.unreadCount;
            chatButton.appendChild(badge);
        }
        chatButton.addEventListener('click', goToTopicsChat);

        //  Отримати кількість непрочитаних
        try {
            const res = await fetch(`/api/chat/${topic.id}/unread-count`, {
                credentials: 'include'
            });
            if (res.ok) {
                const { unreadCount } = await res.json();
                if (unreadCount > 0) {
                    const badge = document.createElement('span');
                    badge.classList.add('badge', 'bg-danger', 'ms-2');
                    badge.textContent = unreadCount;
                    chatButton.appendChild(badge);
                }
            }
        } catch (err) {
            console.error(`Помилка отримання непрочитаних для чату ${topic.chatId}:`, err);
        }

        const leaveButton = document.createElement('button');
        leaveButton.textContent = 'Вийти з гуртка';
        leaveButton.classList.add('btn', 'btn-outline-danger', 'ms-2');
        leaveButton.dataset.topicId = topic.id;
        leaveButton.dataset.topicTitle = topic.title;
        leaveButton.addEventListener('click', leaveTopic);

        cardBody.appendChild(title);
        cardBody.appendChild(mentorsDiv);
        cardBody.appendChild(chatButton);
        cardBody.appendChild(leaveButton);

        card.appendChild(cardBody);
        topicsListElement.appendChild(card);
    });

}


function goToTopicsChat(event) {
    const chatId = event.target.dataset.chatId;
    if (!chatId) {
        alert('Чат недоступний для цього гуртка.');
        return;
    }
    window.location.href = `/chat/${chatId}`;
}

let selectedTopicIdToLeave = null;

function leaveTopic(event) {
    const topicId = event.target.dataset.topicId;
    const topicTitle = event.target.dataset.topicTitle;

    selectedTopicIdToLeave = topicId;

    // Показати назву гуртка в модальному вікні
    document.getElementById('modalTopicTitle').textContent = topicTitle;

    // Показати модальне вікно Bootstrap
    const modal = new bootstrap.Modal(document.getElementById('leaveTopicModal'));
    modal.show();
}

// Обробник кнопки підтвердження
document.getElementById('confirmLeaveButton').addEventListener('click', async () => {
    if (!selectedTopicIdToLeave) return;

    try {
        const response = await fetch(`/leave-topic`, {
            method: 'POST', // або DELETE — залежить від вашого API
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ topicId: selectedTopicIdToLeave})
        });

        const data = await response.json();
        const message = data?.message || 'Не вдалося вийти з гуртка.';

        if (!response.ok) {
            // Виводимо повідомлення з сервера у вигляді помилки
            throw new Error(message);
        }

        // Видаляємо тему з кешу
        topicsListCache = topicsListCache.filter(topic => topic.id != selectedTopicIdToLeave);

        // Оновлюємо список
        updateTopicsList();
        bootstrap.Modal.getInstance(document.getElementById('leaveTopicModal')).hide();
        showAlert("Ви вийшли з гуртка")

    } catch (error) {
        console.error('Помилка при виході з гуртка:', error);
        showAlert(`Помилка при виході з гуртка: ${error.message}`, "danger");
    }finally {
        selectedTopicIdToLeave = null;
    }
});