
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
async function loadBlogs() {
  const response = await fetch(`${BASE_API_URL}/get-blogs`);
  const blogs = await response.json();
  const container = document.getElementById('blog-container');

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

  // 🔥 Вызываем проверку высоты СРАЗУ после отрисовки карточек блогов!
  checkBlogsHeight();
}

// Функция, которая проверяет, вылезли ли блоги за пределы экрана
function checkBlogsHeight() {
  const wrapper = document.getElementById('blogWrapper');
  const btn = document.getElementById('showMoreBtn');
  
  // Убираем класс раскрытия перед замером
  wrapper.classList.remove('expanded');

  // Небольшая задержка, чтобы картинки из Cloudinary успели занять место в DOM
  setTimeout(() => {
    if (wrapper.scrollHeight > wrapper.clientHeight) {
      btn.style.display = 'block'; // Блогов много — показываем кнопку
    } else {
      btn.style.display = 'none';  // Блогов мало — прячем кнопку
    }
  }, 150);
}

// Функция работы кнопки "Показать ещё"
function toggleBlogs() {
  const wrapper = document.getElementById('blogWrapper');
  const btn = document.getElementById('showMoreBtn');
  
  wrapper.classList.toggle('expanded');
  
  if (wrapper.classList.contains('expanded')) {
    btn.textContent = 'Свернуть';
  } else {
    btn.textContent = 'Показать ещё';
    // Плавно возвращаем к началу блогов при сворачивании
    wrapper.scrollIntoView({ behavior: 'smooth' });
  }
}

// Пересчитываем высоту, если пользователь изменил размер окна браузера
window.addEventListener('resize', checkBlogsHeight);

loadBlogs();


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

