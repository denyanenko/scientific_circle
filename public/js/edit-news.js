
Quill.register('modules/blotFormatter', QuillBlotFormatter.default);
const quill = new Quill('#editor', {
    modules: {
        syntax: true,
        toolbar: '#toolbar-container',
        blotFormatter: {}
    },
    placeholder: 'Редагуйте новину...',
    theme: 'snow',
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
    while(n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    const ext = mime.split('/')[1];
    const finalFilename = filename || `image.${ext || 'png'}`;
    return new File([u8arr], finalFilename, { type: mime });
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



const articleId =  window.location.pathname.split('/').pop();
const form = document.getElementById('edit-article-form');
const titleInput = document.getElementById('title');
const coverImageInput = document.getElementById('coverImage');
const currentCoverImagePreview = document.getElementById('currentCoverImagePreview');

let initialTitle = '';
let initialContentHtml = '';
let initialCoverImageUrl = '';

// Завантаження даних статті для редагування
async function loadArticleForEditing() {
    if (!articleId) {
        showAlert('ID статті не знайдено. Неможливо завантажити дані для редагування.', 'danger');
        return;
    }

    try {
        const response = await fetch(`/api/news/${articleId}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Не вдалося завантажити новину. Статус: ${response.status}`);
        }
        const article = await response.json();

        initialTitle = article.title;
        titleInput.value = article.title;
        if (article.contentHtml) {
            initialContentHtml = article.contentHtml;
            quill.root.innerHTML = article.contentHtml;
        }
        else {
            initialContentHtml = '';
            quill.root.innerHTML = '';
        }

        if (article.coverImage) {
            initialCoverImageUrl = article.coverImage;
            currentCoverImagePreview.src = article.coverImage;
            currentCoverImagePreview.style.display = 'block'; // Показати зображення
        } else {
            initialCoverImageUrl = '';
            currentCoverImagePreview.style.display = 'none'; // Сховати, якщо немає поточної обкладинки
        }

    } catch (error) {
        console.error('Помилка завантаження новини для редагування:', error);
        showAlert(`Помилка завантаження даних: ${error.message}`, 'danger');
    }
}

// Обробка відправки форми редагування
form.addEventListener('submit', async function (e) {
    e.preventDefault();

    const currentTitle = titleInput.value.trim();
    const currentRawQuillHtml = quill.root.innerHTML;
    let processedContentHtml;

    if (!currentTitle) { // Змінено з title.trim()
        showAlert('Будь ласка, заповніть заголовок статті.', 'warning');
        return;
    }
    if (quill.getText().trim().length === 0 && !currentRawQuillHtml.includes("<img")) {
        showAlert('Будь ласка, заповніть зміст статті.', 'warning');
        return;
    }

    try {
        processedContentHtml = await processContentImages(currentRawQuillHtml);
        

    } catch (error) {
        showAlert(`Помилка обробки зображень у контенті: ${error.message}`, 'danger');
        return;
    }

    const coverImageFile = coverImageInput.files[0];

    const formData = new FormData();
    let changesMade = false;

    // 1. Перевіряємо, чи змінився заголовок
    if (currentTitle !== initialTitle) {
        formData.append('title', currentTitle);
        changesMade = true;
    }

    // 2. Перевіряємо, чи змінився контент
    if (processedContentHtml !== initialContentHtml) {
        formData.append('contentHtml', processedContentHtml);
        changesMade = true;
    }

    // 3. Перевіряємо, чи обрано новий файл обкладинки
    if (coverImageFile) {
        formData.append('coverImage', coverImageFile);
        changesMade = true;
    }

    if (!changesMade) {
        showAlert('Змін не виявлено. Немає чого оновлювати.', 'info');
        return; // Не відправляємо запит, якщо змін немає
    }

    try {
        // Використовуємо метод PUT для оновлення
        const res = await fetch(`/api/news/${articleId}`, {
            method: 'PUT',
             credentials: 'include',
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Помилка оновлення статті');
        }

        showAlert('Статтю успішно оновлено!', 'success');

        await loadArticleForEditing();
    } catch (err) {
        console.error('Помилка при оновленні:', err);
        showAlert(`Помилка: ${err.message}`, 'danger');
    }
});

// Завантажуємо дані статті при завантаженні сторінки
document.addEventListener('DOMContentLoaded', () => {
    if (articleId) {
        loadArticleForEditing();
    } else {
        showAlert('Не вказано ID новини для редагування.', 'danger');
        form.style.display = 'none';
    }
});