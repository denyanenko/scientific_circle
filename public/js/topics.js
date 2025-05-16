document.addEventListener('DOMContentLoaded', async () => {
    await loadTopics();
});

let topicsListCache = []; // Кеш тем/гуртків
let selectedTopicsCache = []; // Кеш вибраних тем/гуртків

async function loadTopics() {
    if (topicsListCache.length > 0) return;

    try {
        const response = await fetch('/api/topics');
        topicsListCache = await response.json();
        updateTopicsList(); // Оновлюємо список у DOM
    } catch (error) {
        console.error('Помилка завантаження гуртків:', error);
    }
}

function updateTopicsList() {
    const topicsListElement = document.getElementById('topics-list');
    topicsListElement.innerHTML = "";

    topicsListCache.forEach((topic, index) => {
        const li = document.createElement('li');
        li.classList.add('mb-3');

        li.innerHTML = `
            <h2 class="text-start">${topic.title}</h2>
            <div class="ql-editor">${topic.description || 'Без опису'}</div>
            ${index < topicsListCache.length - 1 ? '<hr class="my-4">' : ''}
        `;

        topicsListElement.appendChild(li);
    });
}
