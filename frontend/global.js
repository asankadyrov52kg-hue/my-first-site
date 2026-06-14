//  const BASE_API_URL = "https://manned-untolerated-mallie.ngrok-free.dev"
 const BASE_API_URL = "https://ticlo.onrender.com"
 
 function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
const contactLinks = document.querySelectorAll('.contact');
const loginForm = document.getElementById('loginForm');

// Перебираем ссылки циклом
contactLinks.forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault(); // Отменяем переход по ссылке #

    // ИСПРАВЛЕНО: Добавлена проверка. Класс переключится ТОЛЬКО если форма есть на странице
    if (loginForm) {
      loginForm.classList.toggle('active1');
    }
  });
});

// ИСПРАВЛЕНО: Добавлена проверка. Слушатель submit повесится ТОЛЬКО если форма существует
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const btn = document.getElementById('btn');
    if (btn) btn.disabled = true; // Безопасное отключение кнопки

    const userData = {
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    };

    try {
      const response = await fetch(`${BASE_API_URL}/lo-tic-gin-lo19`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem('adminToken', result.token);
        window.location.href = 'admin.html';
      } else {
         AppNotifier.show(response.status, result.message);
      }
    } catch (error) {
      AppNotifier.show(500, 'Сервер не отвечает');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}




// ======================================menu======================================================================

// Находим ВСЕ элементы с классом contact

const form = document.getElementById("secend__form");

// ИСПРАВЛЕНО: Код сработает только если форма найдена на текущей странице
if (form) {
  form.addEventListener("submit", async (e) => {

    e.preventDefault();
    
    // Безопасное получение значений (с проверкой на существование полей)
    const nameEl = document.getElementById("user_name");
    const emailEl = document.getElementById("email");
    const phoneEl = document.getElementById("phone");
    const requestEl = document.getElementById("user_request");

    if (!nameEl || !emailEl || !phoneEl || !requestEl) return;

    const user_name = nameEl.value;
    const email = emailEl.value;
    const phone = phoneEl.value;
    const user_request = requestEl.value;

    try {
      const response = await fetch(
        `${BASE_API_URL}/send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_name,
            email,
            phone,
            user_request
          }),
        }
      );

      const data = await response.json();
      console.log(data);
      AppNotifier.show(200, "Заявка отправлена");

    } catch (error) {
      console.log(error);
      AppNotifier.show(200, "Ошибка");
    }
  });
}

// =============================================================================================
function autoHeight(element) {
  element.style.height = "auto"; // Сбрасываем высоту, чтобы она уменьшалась при удалении текста
  element.style.height = (element.scrollHeight) + "px";
}
// ================================================================================================
const secend_btn = document.querySelectorAll('.request__btn');
const secend_form = document.getElementById('secend__form');
secend_btn.forEach(link => {
  link.addEventListener('click', function (e) {
    e.preventDefault(); 
    secend_form.classList.toggle('active2');
  });
});

// ==================================status=======================================================
const AppNotifier = {
  config: {
    success: { class: 'toast-success', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' },
    error: { class: 'toast-error', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>' },
    warning: { class: 'toast-warning', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 11h-2V7h2v6zm0 4h-2v-2h2v2z"/></svg>' },
    info: { class: 'toast-info', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>' },
    // ДОБАВИЛИ: Новый тип для вопросов
    confirm: { class: 'toast-confirm', icon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>' }
  },

  getType(status) {
    if (typeof status === 'number') {
      if (status >= 200 && status < 300) return 'success';
      if (status === 401 || status === 403) return 'warning';
      if (status >= 400 && status < 600) return 'error';
    }
    const strStatus = String(status).toLowerCase();
    if (strStatus === 'danger' || strStatus === 'fail') return 'error';
    if (this.config[strStatus]) return strStatus;
    return 'info';
  },

  show(status, message, onConfirm = null) {
    let container = document.getElementById('global-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'global-toast-container';
      container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 12px; font-family: system-ui, sans-serif;';
      document.body.appendChild(container);
    }

    const type = this.getType(status);
    const setup = this.config[type];

    const toast = document.createElement('div');
    toast.className = `app-toast ${setup.class}`;
    
    // Если тип confirm, добавляем кнопки "Да" и "Нет" вместо обычной кнопки закрытия
    const isConfirmType = type === 'confirm';
    
    toast.innerHTML = `
      <div class="toast-icon">${setup.icon}</div>
      <div class="toast-body">
        <div class="toast-title">${type.toUpperCase()} ${typeof status === 'number' ? `(${status})` : ''}</div>
        <div class="toast-message">${message}</div>
        ${isConfirmType ? `
          <div class="toast-actions" style="margin-top: 10px; display: flex; gap: 8px;">
            <button class="toast-btn-yes" style="background: #fff; color: #e71d36; border: none; padding: 4px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 12px;">Да</button>
            <button class="toast-btn-no" style="background: rgba(255,255,255,0.2); color: #fff; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;">Нет</button>
          </div>
        ` : ''}
      </div>
      ${!isConfirmType ? '<button class="toast-close" onclick="this.parentElement.remove()">×</button>' : ''}
    `;

    container.appendChild(toast);

    // Логика для кнопок подтверждения
    if (isConfirmType && onConfirm) {
      toast.querySelector('.toast-btn-yes').addEventListener('click', () => {
        toast.remove();
        onConfirm(); // Вызываем переданную функцию удаления
      });
      
      toast.querySelector('.toast-btn-no').addEventListener('click', () => {
        toast.remove();
      });
    }

    // Автоудаление (отключаем его для окон подтверждения, чтобы они не исчезали сами)
    if (!isConfirmType) {
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
      }, 4000);
    }
  }
};
