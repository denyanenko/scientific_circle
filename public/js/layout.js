document.addEventListener('DOMContentLoaded', () => {
    addBootstrapLinks();
    renderHeader();
    renderFooter();
});

function addBootstrapLinks() {
    // Перевіряємо, чи вже підключений Bootstrap
    if (!document.querySelector('link[href*="bootstrap.min.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css';
        document.head.appendChild(link);
    }

    if (!document.querySelector('script[src*="bootstrap.bundle.min.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js';
        document.body.appendChild(script);
    }
    if (!document.querySelector('link[href*="bootstrap-icons.css"]')) {
        const iconLink = document.createElement('link');
        iconLink.rel = 'stylesheet';
        iconLink.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.0/font/bootstrap-icons.css';
        document.head.appendChild(iconLink);
    }

}

function renderHeader() {
    const header = document.createElement('header');
    header.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bg-light border-bottom shadow-sm">
      <div class="container"> 
      <a class="navbar-brand" href="/"> <img src="/image/ist_logo.webp" alt="Логотип" class="logo-img">
      <span class="fw-bold ms-2">Науковий гурток</span></a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarContent">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarContent">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item"><a class="nav-link" href="/">Головна</a></li>
            <li class="nav-item"><a class="nav-link" href="/news">Новини</a></li>
            <li class="nav-item"><a class="nav-link" href="/topics">Гуртки</a></li>
            <li class="nav-item"><a class="nav-link" href="/contact.html">Контакти</a></li>
          </ul>
          <div id="userMenu" class="d-flex"></div>
        </div>
      </div>
    </nav>
  `;

    document.body.prepend(header);
    const logoImg = header.querySelector('.logo-img');
    if (logoImg) {
        logoImg.style.height = '40px';
        logoImg.style.transformOrigin = 'left center';
        logoImg.style.transform = 'scale(1.3)';
        logoImg.style.marginRight = '10px';
    }
    renderUserMenu();
}

function renderFooter() {
    const footer = document.createElement('footer');
    footer.className = "bg-light text-center text-muted py-4 mt-5 border-top";
    footer.innerHTML = `
    <div class="container d-flex justify-content-center align-items-center">
      <!-- Логотип зліва -->
      <div class="d-none d-sm-block" style="margin-right: 35px;">
        <img src="/image/KPI_logo.svg" alt="KPI Logo" class="footer-logo" style="height: 120px; ; margin: -18px;">
      </div>
      
      <div style="padding: 10px;">
        <p class="mb-1">&copy; ${new Date().getFullYear()} Кафедра інформаційних систем та технологій. Всі права захищені.</p>
        <p class="mb-1">Київ, Політехнічна 41, КПІ ім. Ігоря Сікорського, корп. 18, кімн. 528</p>
        <p class="mb-1">Контактна пошта: <a href="mailto:kafedra@ist.kpi.ua">kafedra@ist.kpi.ua</a></p>
        <p class="mb-1">Телефони: <a href="tel:+380442048610">(044) 204-86-10</a>, <a href="tel:+380442049285">(044) 204-92-85</a></p>
        <p>
          <a href="https://t.me/+uapbNptRMqA2NDIy" class="me-2" target="_blank"><i class="bi bi-telegram"></i> Telegram</a>
          <a href="https://www.facebook.com/actskpi" class="me-2" target="_blank"><i class="bi bi-facebook"></i> Facebook</a>
        </p>
      </div>
      
      <!-- Логотип справа -->
      <div class="d-none d-sm-block" style="margin-left: 35px;">
        <img src="/image/fice_logo_big.webp" alt="KPI Logo" class="footer-logo" style="height: 120px;">
      </div>
    </div>
  `;
    document.body.appendChild(footer);
}





function renderUserMenu() {
    const userMenu = document.getElementById('userMenu');
    if (!userMenu) return;

    fetch('/verifyAndRefresh', {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => {
            if (!res.ok) throw new Error();
            return res.json();
        })
        .then(data => {
            // Збереження у глобальну змінну
            window.currentUser = data.user;

            let menuItems = '';

            if (data.user.role === 'admin') {
                menuItems += `<li><a class="dropdown-item" href="/my-chats">Мої чати</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/applications/manage">Заявки на вступ</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/manage-news">Керувати новинами</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/manage-topics">Керувати гуртками</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/send-invite">Надіслати запрошення</a></li>`;
            }
            else if (data.user.role === 'mentor') {
                menuItems += `<li><a class="dropdown-item" href="/my-topics">Мої гуртки</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/my-chats">Мої чати</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/manage-news">Керувати новинами</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/manage-topics">Керувати гуртками</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/join-topic">Вступити в гурток</a></li>`;

            }
            else {
                menuItems += `<li><a class="dropdown-item" href="/my-topics">Мої гуртки</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/my-chats">Мої чати</a></li>`;
                menuItems += `<li><a class="dropdown-item" href="/join-topic">Вступити в гурток</a></li>`;
            }


            userMenu.innerHTML = `
              <div class="dropdown">
                <button class="btn btn-outline-secondary dropdown-toggle d-flex align-items-center" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i class="bi bi-person-circle me-2 fs-5"></i>
                </button>
                <ul class="dropdown-menu dropdown-menu-lg-end">
                  <li><a class="dropdown-item" href="/profile">Профіль</a></li>
                  ${menuItems}
                  <li><button class="dropdown-item" id="logoutBtn">Вийти</button></li>
                </ul>
              </div>`;

            document.getElementById('logoutBtn').addEventListener('click', logoutUser);
        })
        .catch(() => {
            userMenu.innerHTML = `<a class="btn btn-outline-primary" href="/login">Увійти</a>`;
        });
}

function logoutUser() {
    fetch('/logout', {
        method: 'POST',
        credentials: 'include'
    })
        .then(res => {
            if (res.ok) {
                window.location.href = '/';
            } else {
                alert('Помилка при виході з акаунту');
            }
        })
        .catch(err => {
            console.error('Logout error:', err);
            alert('Помилка з\'єднання при спробі вийти');
        });
}

function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3`;
    alert.style.zIndex = 9999;
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    document.body.appendChild(alert);
    setTimeout(() => alert.remove(), 4000);
}