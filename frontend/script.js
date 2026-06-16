
// --------------------------swiper------------------------------------------------------------------------
// --------------------------swiper------------------------------------------------------------------------
const swiperHero = new Swiper(".hero-slider", {
  loop: true,
  breakpoints: {
    800: {
      slidesPerView: 3,
    },
    600: {
      slidesPerView: 2,
    },
    400: {
      slidesPerView: 1,
    }
  },
  spaceBetween: 30,
  autoplay: {
    delay: 3000,
  },
  speed: 2000,
  freeMode: true,
  pagination: {
    el: ".hero-slider .swiper-pagination",
    clickable: true,
  },
});

async function initSwiper() {
  const res = await fetch(`${BASE_API_URL}/api/admin/slider`);
  const data = await res.json();

  const wrapper = document.querySelector('.swiper-wrapper');
  wrapper.innerHTML = data.map(s => `
        <div class="swiper-slide"><img loading="lazy" src="${s.image_url}"></div>
    `).join('');

  const swiper = new Swiper('.mySwiper', {
    loop: true,
    centeredSlides: true,
    slidesPerView: 'auto',

    effect: 'coverflow',
    coverflowEffect: {
      rotate: 1,
      stretch: 50,
      depth: 50,
      modifier: 1.5,
      slideShadows: true,
    },

    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    },
  });

}
initSwiper();
// ======================accardeon=========================================================================

const questionsCard = document.querySelectorAll(".question__card")


questionsCard.forEach((item) => {
  item.addEventListener("click", () => {
    item.classList.toggle("active")

    questionsCard.forEach((el) => {
      if (el !== item) {
        el.classList.remove("active")
      }
    })

  })
});

//   ======================================blog===========================================================
// Запоминаем ширину экрана для защиты от бага Safari с адресной строкой
let lastWidth = window.innerWidth;

async function loadBlogs() {
  try {
    const response = await fetch(`${BASE_API_URL}/get-blogs`);
    const blogs = await response.json();
    const container = document.getElementById('blog-container');

    // Рендерим ваши карточки блогов
    container.innerHTML = blogs.map(post => `
        <div class="blog-card">
            <h2 class="blog-id"> ${post.id}</h2> 
            ${post.image_name ? `<img src="${post.image_name}">` : ''}
            <div class="blog-card-content">
                <h3>${escapeHtml(post.title)}</h3>
                <small>${new Date(post.blog_date).toLocaleDateString()}</small>
                <p class="blog_desk">${escapeHtml(post.content.substring(0, 100))}...</p>
                <a href="blog.html?id=${post.id}" class="blog__btn">Читать далее</a>
            </div>
        </div>
    `).join('');

    // Запускаем проверку высоты сразу после добавления карточек в HTML
    checkBlogsHeight();

  } catch (error) {
    console.error("Ошибка при загрузке блогов:", error);
  }
}

// Функция точного замера высоты (ждет загрузки картинок Cloudinary)
function checkBlogsHeight() {
  const wrapper = document.getElementById('blogWrapper');
  const btn = document.getElementById('showMoreBtn');
  
  // Перед замером временно убеждаемся, что класс expanded снят
  wrapper.classList.remove('expanded');

  // Находим все картинки внутри блогов
  const images = wrapper.querySelectorAll('img');
  
  // Создаем массив промисов, чтобы дождаться загрузки каждого изображения
  const imgPromises = Array.from(images).map(img => {
    if (img.complete) return Promise.resolve();
    return new Promise(resolve => {
      img.onload = resolve;
      img.onerror = resolve; // Если картинка сломана, всё равно продолжаем
    });
  });

  // Как только все картинки загрузились и заняли свои места — меряем высоту
  Promise.all(imgPromises).then(() => {
    // +5 пикселей для компенсации погрешностей округления в субпиксельной сетке iOS
    if (wrapper.scrollHeight > (wrapper.clientHeight + 5)) {
      btn.style.display = 'block'; // Постов много — показываем кнопку
    } else {
      btn.style.display = 'none';  // Постов мало — прячем кнопку
    }
  });
}

// Логика клика по кнопке "Показать ещё" / "Свернуть"
function toggleBlogs() {
  const wrapper = document.getElementById('blogWrapper');
  const btn = document.getElementById('showMoreBtn');
  
  wrapper.classList.toggle('expanded');
  
  if (wrapper.classList.contains('expanded')) {
    btn.textContent = 'Свернуть';
  } else {
    btn.textContent = 'Показать ещё';
    
    // Проверяем, зашел ли пользователь с устройства Apple
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream;

    if (isIOS) {
      // Для iOS: мгновенный возврат к началу блока (smooth-скролл на больших блоках в iOS багует)
      wrapper.scrollIntoView({ behavior: 'auto', block: 'start' });
    } else {
      // Для Android и ПК: оставляем красивый плавный скролл
      wrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Умный слушатель изменения экрана. Игнорирует скрытие адресной строки на iPhone!
window.addEventListener('resize', () => {
  if (window.innerWidth !== lastWidth) {
    lastWidth = window.innerWidth; // Обновляем ширину, если перевернули экран
    checkBlogsHeight();            // Пересчитываем только при реальном изменении размера
  }
});

// Запускаем всё приложение
loadBlogs();

// ============================================window-show======================================================================
const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
          
        }
    });
}, {
    threshold: 0.1 
});
document.querySelectorAll('.hidden-section').forEach((el) => observer.observe(el));

// =========================================status======================================================================

