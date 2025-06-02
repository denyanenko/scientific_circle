Quill.register('modules/blotFormatter', QuillBlotFormatter.default);
const quill = new Quill('#editor', {
    modules: {
        syntax: true,
        toolbar: '#toolbar-container',
        blotFormatter: {}
    },
    placeholder: 'Описати гурток...',
    theme: 'snow',
});

const topicId = window.location.pathname.split('/').pop();
const form = document.getElementById('edit-topic-form');
const titleInput = document.getElementById('topicTitle');
const mentorChecklistDiv = document.getElementById('mentorChecklist');
const studentListContainer = document.getElementById('studentListContainer');
const noStudentsMessage = document.getElementById('noStudentsMessage');

// Модальне вікно для видалення студента
const confirmStudentDeleteModal = new bootstrap.Modal(document.getElementById('confirmStudentDeleteModal'));
const confirmDeleteStudentBtn = document.getElementById('confirmDeleteStudentBtn');
let studentIdToDelete = null;

let initialTopicData = {
    title: '',
    descriptionHtml: '',
    mentorIds: []
};



document.addEventListener('DOMContentLoaded', () => {
    if (topicId) {
        loadTopicForEditing();
    } else {
        showAlert('Не вказано ID гуртка для редагування або URL неправильний.', 'danger');
        if (form) form.style.display = 'none';
    }
});

async function loadTopicForEditing() {
    if (!topicId) {
        showAlert('ID гуртка не знайдено або URL неправильний.', 'danger');
        return;
    }

    try {
        const response = await fetch(`/api/topics/${topicId}`); // Ваш API для отримання даних гуртка
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Не вдалося завантажити гурток. Статус: ${response.status}`);
        }
        const topic = await response.json();

        initialTopicData.title = topic.title;
        titleInput.value = topic.title;

        if (topic.description) {
            initialTopicData.descriptionHtml = topic.description;
            quill.root.innerHTML = topic.description;
        } else {
            initialTopicData.descriptionHtml = '';
            quill.root.innerHTML = '';
        }

        // Спочатку завантажуємо всіх менторів, потім відмічаємо обраних
        await loadAllMentors(); // Завантажує і рендерить чекліст

        // Отримуємо ID поточних менторів цього гуртка
        const currentMentorsRes = await fetch(`/api/topics/${topicId}/mentors `);
        if (currentMentorsRes.ok) {
            const currentMentorUsers = await currentMentorsRes.json();
            const currentMentorIds = currentMentorUsers.map(m => m.id);
            initialTopicData.mentorIds = [...currentMentorIds]; // Копіюємо масив

            // Відмічаємо чекбокси для поточних менторів
            currentMentorIds.forEach(mentorId => {
                const checkbox = mentorChecklistDiv.querySelector(`input[type="checkbox"][value="${mentorId}"]`);
                if (checkbox) checkbox.checked = true;
            });
            updateSelectedMentorsDisplay(); // Оновлюємо текст під кнопкою
        } else {
            console.warn('Не вдалося завантажити поточних менторів для гуртка.');
            initialTopicData.mentorIds = [];
            updateSelectedMentorsDisplay([]);
        }

        await loadTopicStudents();

    } catch (error) {
        console.error('Помилка завантаження гуртка для редагування:', error);
        showAlert(`Помилка завантаження даних: ${error.message}`, 'danger');
    }
}
function updateSelectedMentorsDisplay() {
    const checkedBoxes = document.querySelectorAll('#mentorChecklist input[type="checkbox"]:checked');
    const names = Array.from(checkedBoxes).map(cb => cb.nextElementSibling.textContent.trim());

    const selectedMentorsDiv = document.getElementById('selectedMentors');
    selectedMentorsDiv.innerHTML = names.length > 0
        ? `<strong>Обрані ментори:</strong> ${names.join(', ')}`
        : `<em>Менторів не обрано</em>`;
}
async function loadAllMentors() {
    try {
        const res = await fetch('/api/mentors/name');
        const mentors = await res.json();

        mentors.forEach((mentor, index) => {
            const checkbox = document.createElement('div');
            checkbox.className = 'form-check';

            checkbox.innerHTML = `
                <input class="form-check-input" type="checkbox" value="${mentor.id}" id="mentor${index}">
                <label class="form-check-label" for="mentor${index}">
                    ${mentor.name}
                </label>
            `;

            mentorChecklistDiv.appendChild(checkbox);
        });
    } catch (err) {
        console.error('Не вдалося завантажити менторів:', err);
    }
}

async function loadTopicStudents() {
    if (!topicId) return;
    try {
        const res = await fetch(`/api/topics/${topicId}/students`);
        if (!res.ok) throw new Error('Не вдалося завантажити студентів гуртка');
        const students = await res.json();

        studentListContainer.innerHTML = '';
        if (students.length === 0) {
            noStudentsMessage.style.display = 'block';
        } else {
            noStudentsMessage.style.display = 'none';
            students.forEach(student => {
                const studentElement = document.createElement('div');
                studentElement.className = 'list-group-item d-flex justify-content-between align-items-center';

                const nameSpan = document.createElement('span');
                nameSpan.textContent = student.name;

                const deleteButton = document.createElement('button');
                deleteButton.type = 'button';
                deleteButton.className = 'btn btn-outline-danger btn-sm';
                deleteButton.textContent = 'Видалити';

                // Додаємо обробник події
                deleteButton.addEventListener('click', () => {
                    studentIdToDelete = student.id;
                    topicIdForStudentDeletion = topicId;
                    confirmStudentDeleteModal.show();
                });

                // Додаємо span та кнопку до div
                studentElement.appendChild(nameSpan);
                studentElement.appendChild(deleteButton);

                studentListContainer.appendChild(studentElement);
            });
            initialTopicData.studentIds = students.map(s => s.id); // Зберігаємо початковий список ID студентів
        }
    } catch (error) {
        console.error('Помилка завантаження студентів гуртка:', error);
        showAlert('Не вдалося завантажити список студентів.', 'danger');
        noStudentsMessage.style.display = 'block';
    }
}


const mentorModal = document.getElementById('mentorModal');

mentorModal.addEventListener('hidden.bs.modal', () => {
    updateSelectedMentorsDisplay();
});

// Обробник для кнопки підтвердження видалення студента в модальному вікні
confirmDeleteStudentBtn.addEventListener('click', async () => {
    if (!studentIdToDelete || !topicIdForStudentDeletion) return;

    try {
        const res = await fetch(`/api/topics/${topicIdForStudentDeletion}/users/${studentIdToDelete}`, {
            method: 'DELETE',
            credentials: "include"
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || 'Помилка видалення студента з гуртка');
        }
        showAlert('Студента успішно видалено з гуртка!', 'success');
        confirmStudentDeleteModal.hide();
        await loadTopicStudents(); // Оновлюємо список студентів на сторінці
    } catch (error) {
        console.error('Помилка видалення студента:', error);
        showAlert(`Помилка: ${error.message}`, 'danger');
        confirmStudentDeleteModal.hide();
    } finally {
        studentIdToDelete = null;
        topicIdForStudentDeletion = null;
    }
});

function getSelectedMentorIdsFromChecklist() {
    return Array.from(mentorChecklistDiv.querySelectorAll('input[type="checkbox"]:checked'))
        .map(cb => parseInt(cb.value));
}

// Обробка відправки форми редагування
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentTitle = titleInput.value.trim();
    const currentRawQuillHtml = quill.root.innerHTML; // Це опис гуртка
    let processedDescriptionHtml;

    if (!currentTitle) {
        showAlert('Будь ласка, заповніть назву гуртка.', 'warning');
        return;
    }

    try {
        processedDescriptionHtml = await processContentImages(currentRawQuillHtml);
    } catch (error) {
        showAlert(`Помилка обробки зображень в описі: ${error.message}`, 'danger');
        return;
    }

    const currentSelectedMentorIds = getSelectedMentorIdsFromChecklist();

    const payload = {}; // Формуємо payload тільки зі змінених даних
    let changesMade = false;

    if (currentTitle !== initialTopicData.title) {
        payload.title = currentTitle;
        changesMade = true;
    }
    if (processedDescriptionHtml !== initialTopicData.descriptionHtml) {
        payload.description = processedDescriptionHtml; // Надсилаємо як 'description'
        changesMade = true;
    }

    // Порівняння масивів ID менторів
    const mentorsChanged = initialTopicData.mentorIds.length !== currentSelectedMentorIds.length ||
        !initialTopicData.mentorIds.every(id => currentSelectedMentorIds.includes(id)) ||
        !currentSelectedMentorIds.every(id => initialTopicData.mentorIds.includes(id));

    if (mentorsChanged) {
        payload.mentorIds = currentSelectedMentorIds;
        changesMade = true;
    }

    if (!changesMade) {
        showAlert('Змін не виявлено. Немає чого оновлювати.', 'info');
        return;
    }

    try {
        const res = await fetch(`/api/topics/${topicId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload) // Надсилаємо JSON, бо файлів тут немає (обкладинки немає)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Помилка оновлення гуртка');
        }

        showAlert('Гурток успішно оновлено!', 'success');
      await loadTopicForEditing();
    } catch (err) {
        console.error('Помилка при оновленні гуртка:', err);
        showAlert(`Помилка: ${err.message}`, 'danger');
    }
});



async function processContentImages(contentHtml) {
    const div = document.createElement('div');
    div.innerHTML = contentHtml;
    const images = div.querySelectorAll('img');
    for (const img of images) {
        const src = img.getAttribute('src');
        if (src && src.startsWith('data:image/')) { // Тільки нові base64 зображення
            try {
                const file = dataURLtoFile(src);
                const uploadedUrl = await uploadImageToServer(file);
                img.setAttribute('src', uploadedUrl);
            } catch (error) {
                console.error("Помилка завантаження зображення з редактора:", error);
            }
        }
    }
    return div.innerHTML;
}

function dataURLtoFile(dataUrl, filename) {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Неправильний формат Data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[arr.length - 1]); // arr.length - 1 для випадку, якщо dataUrl містить коми в метаданих
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    const ext = mime.split('/')[1];
    const finalFilename = filename || `image.${ext || 'png'}`;
    return new File([u8arr], finalFilename, {type: mime});
}

async function uploadImageToServer(file) {
    const formData = new FormData();
    formData.append('image', file);
    const res = await fetch('/upload-image', {
        method: 'POST',
        credentials: 'include',
        body: formData
    });
    if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.message || 'Помилка при завантаженні зображення на сервер');
    }
    const data = await res.json();
    return data.url; // <- сюди сервер повертає шлях до зображення, наприклад /uploads/abc123.jpg
}