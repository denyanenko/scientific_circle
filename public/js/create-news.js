Quill.register('modules/blotFormatter', QuillBlotFormatter.default);
const quill = new Quill('#editor', {
    modules: {
        syntax: true,
        toolbar: '#toolbar-container',
        blotFormatter: {}
    },
    placeholder: 'Написати новину...',
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

    if (!res.ok) throw new Error('Помилка при завантаженні зображення');
    const data = await res.json();
    return data.url; // <- сюди сервер повертає шлях до зображення, наприклад /uploads/abc123.jpg
}

// Обробка відправки форми
document.getElementById('article-form').addEventListener('submit', async function (e) {
    e.preventDefault();

    const form = e.target;
    const title = form.title.value;
    const rawHtml = quill.root.innerHTML;
    const contentHtml = await processContentImages(rawHtml); // ← ось тут

    const file = form.coverImage.files[0];
    if (!title || !contentHtml || !file) {
        showAlert('Будь ласка, заповніть усі поля та виберіть зображення.', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('contentHtml', contentHtml);
    formData.append('coverImage', file);

    try {
        const res = await fetch('/save-article', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Помилка збереження статті');
        }

        showAlert('Стаття збережена!');
    } catch (err) {
        console.error('Помилка при збереженні:', err);
        showAlert(`Помилка: ${err.message}`, 'danger');
    }
});
