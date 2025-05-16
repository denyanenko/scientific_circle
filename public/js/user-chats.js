document.addEventListener('DOMContentLoaded', async () => {
    await loadChats();
});

let chatListCache = [];

async function loadChats() {
    try {
        const response = await fetch('/user-chats', { credentials: 'include' });
        if (!response.ok) throw new Error('Не вдалося отримати чати.');

        const chats = await response.json();
        chatListCache = await Promise.all(chats.map(async (chat) => {
            let unreadCount = 0;
            try {
                const unreadRes = await fetch(`/api/chat/${chat.id}/unread-count`, { credentials: 'include' });
                if (unreadRes.ok) {
                    const unreadData = await unreadRes.json();
                    unreadCount = unreadData.unreadCount || 0;
                }
            } catch (err) {
                console.warn(`Неможливо отримати кількість непрочитаних для чату ${chat.id}`);
            }

            return {
                ...chat,
                unreadCount
            };
        }));

        updateChatList();
    } catch (err) {
        console.error('Помилка завантаження чатів:', err);
    }
}

function updateChatList() {
    const chatListElement = document.getElementById('chats-list');
    chatListElement.innerHTML = "";

    if (chatListCache.length === 0) {
        const message = document.createElement('p');
        message.textContent = "У вас немає активних чатів.";
        chatListElement.appendChild(message);
        return;
    }

    chatListCache.forEach(chat => {
        const card = document.createElement('div');
        card.classList.add('card', 'mb-3', 'shadow-sm');

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body', 'd-flex', 'justify-content-between', 'align-items-center');

        const title = document.createElement('h5');
        title.classList.add('mb-0');
        title.textContent = chat.name || `Чат №${chat.id}`;

        const chatButton = document.createElement('button');
        chatButton.classList.add('btn', 'btn-outline-primary', 'position-relative');
        chatButton.textContent = 'Відкрити чат';
        chatButton.dataset.chatId = chat.id;
        chatButton.addEventListener('click', () => {
            window.location.href = `/chat/${chat.id}`;
        });

        if (chat.unreadCount > 0) {
            const badge = document.createElement('span');
            badge.classList.add('position-absolute', 'top-0', 'start-100', 'translate-middle', 'badge', 'rounded-pill', 'bg-danger');
            badge.textContent = chat.unreadCount;
            chatButton.appendChild(badge);
        }

        cardBody.appendChild(title);
        cardBody.appendChild(chatButton);
        card.appendChild(cardBody);
        chatListElement.appendChild(card);
    });
}
