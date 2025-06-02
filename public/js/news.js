let offset = 0;
const limit = 9;
let loading = false;
let noMoreNews = false;
const container = document.getElementById('news-container');
const loadingSpinner = document.getElementById('loading');

async function loadNews() {
    if (loading || noMoreNews) return;
    loading = true;
    loadingSpinner.classList.remove('d-none');

    try {
        const response = await fetch(`/api/news?offset=${offset}&limit=${limit}`);
        const news = await response.json();

        if (news.length === 0) {
            if (offset === 0) {
                noNewsMessage.classList.remove('d-none'); // Показати повідомлення
            }
            noMoreNews = true;
            loadingSpinner.classList.add('d-none');
            return;
        }

        news.forEach(article => {
            const col = document.createElement('div');
            col.className = 'col-12 col-sm-6 col-md-4';

            const formattedDate = new Date(article.createdAt).toLocaleDateString('uk-UA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            col.innerHTML = `
              <a href="/news/${article.id}" class="text-decoration-none text-dark">
                <div class="card shadow-sm h-100 news-card position-relative d-flex flex-column">
                  <img src="${article.coverImage}" class="card-img-top" style="max-height:200px; object-fit: cover;" alt="Обкладинка">
                  <div class="card-body">
                      <h5 class="card-title mb-1">${article.title}</h5>
                      <small class="text-muted">${formattedDate}</small>
                  </div>
                </div>
              </a>
            `;

            container.appendChild(col);
        });

        offset += limit;
    } catch (error) {
        console.error('Помилка при завантаженні новин:', error);
    } finally {
        loading = false;
        loadingSpinner.classList.add('d-none');
    }
}


// Перший запуск
loadNews();

// Нескінченний скролл
window.addEventListener('scroll', () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 100;
    if (nearBottom) {
        loadNews();
    }
});


