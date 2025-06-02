document.addEventListener('DOMContentLoaded', async () => {
    await loadTopics();
    loadCriteria();
    document.getElementById('help-btn').addEventListener('click', showTopicSelection);
});

let topicsListCache = []; // Кеш тем/гуртків
let selectedTopicsCache = []; // Кеш вибраних тем/гуртків

async function loadTopics() {
    if (topicsListCache.length > 0) return;

    try {
        const response = await fetch('/topics-not-joined', { credentials: 'include' });

        // Перевірка на успішний статус відповіді
        if (!response.ok) {
            throw new Error('Немає доступних гуртків для приєднання');
        }

        const topics = await response.json();
        // Завантажити менторів для кожної теми
        const topicsWithMentors = await Promise.all(topics.map(async (topic) => {
            const mentorsResponse = await fetch(`/api/topics/${topic.id}/mentors `, { credentials: 'include' });
            const mentors = await mentorsResponse.json();
            return {
                ...topic,
                mentors: mentors || []
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
        message.textContent = "Наразі немає доступних гуртків для вступу.";
        message.classList.add('text-center', 'text-secondary', 'mt-5', 'fs-4', 'fw-semibold');
        topicsListElement.appendChild(message);
        return;
    }

    topicsListCache.forEach((topic) => {
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

        const joinButton = document.createElement('button');
        joinButton.textContent = 'Вступити до гуртка';
        joinButton.classList.add('btn', 'btn-outline-primary');
        joinButton.dataset.topicId = topic.id;
        joinButton.addEventListener('click', joinTopic);

        cardBody.appendChild(title);
        cardBody.appendChild(mentorsDiv);
        cardBody.appendChild(joinButton);

        card.appendChild(cardBody);
        topicsListElement.appendChild(card);
    });
}



function joinTopic(event) {
    const topicId = event.target.dataset.topicId;

    fetch('/join-topic', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ topicId })
    })
        .then(async response => {
            const data = await response.json();
            const message = data?.message || 'Невідома відповідь сервера';

            if (!response.ok) {
                // Виводимо повідомлення з сервера у вигляді помилки
                throw new Error(message);
            }

            // Успішне приєднання
            showAlert(message);
            // Видалення теми з кешу
            const topicIndex = topicsListCache.findIndex(topic => topic.id == topicId);
            if (topicIndex !== -1) {
                topicsListCache.splice(topicIndex, 1);
                updateTopicsList();
            }
        })
        .catch(error => {
            console.error('Помилка при вступі до гуртка:', error);
            showAlert(error.message || 'Помилка: не вдалося вступити до гуртка', 'danger');
        });

}





let criteriaList = [
    { name: "Складність", isMax: false, weight: 5 },
    { name: "Цікавість", isMax: true, weight: 5 },
    { name: "Практична користь", isMax: true, weight: 5 },
    { name: "Обізнаність в темі", isMax: true, weight: 5 },
    { name: "Новизна", isMax: true, weight: 5 }
];

function loadCriteria() {
    const criteriaForm = document.getElementById('criteria-form');
    criteriaForm.innerHTML = "";
    criteriaList.forEach((criterion, index) => {
        const div = document.createElement('div');
        div.innerHTML = `
            <label>
                k${index + 1}:<input type="text" class="criterion-name" data-index="${index}" value="${criterion.name}" required>
                <input type="number" class="criterion-weight" data-index="${index}" min="1" max="10" value="${criterion.weight}" title="Введіть вагу критерія від 1 до 10" required>
                <select class="criterion-optimization" data-index="${index}">
                    <option value="max" ${criterion.isMax ? "selected" : ""}>Максимізувати</option>
                    <option value="min" ${!criterion.isMax ? "selected" : ""}>Мінімізувати</option>
                </select>
                <button class="remove-criterion" data-index="${index}">❌</button>
            </label>
        `;
        criteriaForm.appendChild(div);
    });

    document.getElementById('add-criterion').addEventListener('click', addCriterion);
    document.querySelectorAll('.criterion-weight, .criterion-optimization, .criterion-name').forEach(input => {
        input.addEventListener('input', updateCriteria);
    });
    document.querySelectorAll('.remove-criterion').forEach(button => {
        button.addEventListener('click', removeCriterion);
    });
}

function addCriterion() {
    criteriaList.push({ name: "Новий критерій", isMax: true, weight: 5 });
    loadCriteria();
    generateMatrix();
}

function updateCriteria() {
    document.querySelectorAll('.criterion-name').forEach(input => {
        criteriaList[input.dataset.index].name = input.value;
    });
    document.querySelectorAll('.criterion-weight').forEach(input => {
        let value = parseInt(input.value);
        value = isNaN(value) ? 1 : Math.min(10, Math.max(1, value));
        input.value = value;
        criteriaList[input.dataset.index].weight = value;
    });
    document.querySelectorAll('.criterion-optimization').forEach(select => {
        criteriaList[select.dataset.index].isMax = select.value === "max";
    });
    generateMatrix();
}

function removeCriterion(event) {
    const index = event.target.dataset.index;
    criteriaList.splice(index, 1);
    loadCriteria();
    generateMatrix();
}

function generateMatrix() {
    const selectedTopics = Array.from(document.querySelectorAll('.topic-checkbox:checked')).map(input => input.value);
    selectedTopicsCache = selectedTopics;
    const matrixTable = document.getElementById('matrix-table');
    matrixTable.innerHTML = "";

    if (selectedTopics.length === 0) {
        return;
    }

    let headerRow = "<tr><th>Гурток</th>";
    criteriaList.forEach((c, i) => {
        headerRow += `<th>k${i + 1}</th>`;
    });
    headerRow += "</tr>";
    matrixTable.innerHTML += headerRow;

    selectedTopics.forEach(topicId => {
        const topic = topicsListCache.find(t => t.id == topicId);
        let row = `<tr><td>${topic.title}</td>`;
        criteriaList.forEach((c, index) => {
            row += `<td><input type="number" class="matrix-input" data-topic="${topicId}" data-criterion="${index}" min="0" max="10" required placeholder="${c.name}" title="Введіть оцінку від 0 до 10"></td>`;
        });
        row += "</tr>";
        matrixTable.innerHTML += row;
    });

    document.querySelectorAll('.matrix-input').forEach(input => {
        input.addEventListener('input', (event) => {
            let value = parseInt(event.target.value);
            event.target.value = Math.min(10, Math.max(0, isNaN(value) ? 0 : value));
        });
    });

    document.getElementById('matrix-section').style.display = 'block';
}

function showTopicSelection() {
    const topicSelectionElement = document.getElementById('topic-selection');
    topicSelectionElement.style.display = 'block';

    const checkboxListElement = document.getElementById('checkbox-list');
    checkboxListElement.innerHTML = "";

    topicsListCache.forEach(topic => {
        const li = document.createElement('li');
        li.innerHTML = `<input type="checkbox" class="topic-checkbox" data-id="${topic.id}" value="${topic.id}"> ${topic.title}`;
        checkboxListElement.appendChild(li);
    });

    document.querySelectorAll('.topic-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', generateMatrix);
    });

    document.getElementById('criteria-section').style.display = 'block';
}

function sendMatrixToServer() {
    const matrix = [];

    document.querySelectorAll('#matrix-table tbody:not(:first-child) tr').forEach(row => {
        const rowData = [];
        row.querySelectorAll('td:not(:first-child)').forEach(cell => {
            const input = cell.querySelector('.matrix-input');
            rowData.push(input ? parseInt(input.value) || 0 : 0);
        });
        matrix.push(rowData);
    });

    const weights = criteriaList.map(criterion => criterion.weight);
    const isMaxCriteria = criteriaList.map(criterion => !!criterion.isMax);

    fetch('/api/matrix', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            matrix: matrix,
            weights: weights,
            isMaxCriteria: isMaxCriteria
        })
    })
        .then(response => response.json())
        .then(data => {
            console.log('Відповідь сервера:', data);
            displayResults(data.topicsRange);
        })
        .catch(error => console.error('Помилка відправлення матриці:', error));
}

function displayResults(topicsRange) {
    const resultListElement = document.getElementById('result-list');
    resultListElement.innerHTML = "";

    topicsRange.forEach((item, index) => {
        const topicId = selectedTopicsCache[item[0] - 1];
        const topic = topicsListCache.find(t => t.id == topicId);
        const li = document.createElement('li');
        li.textContent = `${topic.title}: ${item[1].toFixed(4)} ${index === 0 ? '👑' : ''}`;
        resultListElement.appendChild(li);
    });

    document.getElementById('result-section').style.display = 'block';
}

document.getElementById('submit-matrix-btn').addEventListener('click', sendMatrixToServer);