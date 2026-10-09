'use strict';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (window.lucide) lucide.createIcons();
const menuButton = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#nav');

function updateMenuAccessibility(open) {
  const mobileMenu = window.innerWidth <= 800;
  navigation.inert = mobileMenu && !open;
  if (mobileMenu) navigation.setAttribute('aria-hidden', String(!open));
  else navigation.removeAttribute('aria-hidden');
}

function closeMenu() {
  navigation.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Abrir menu');
  updateMenuAccessibility(false);
}
menuButton.addEventListener('click', () => {
  const open = navigation.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  updateMenuAccessibility(open);
});
navigation.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeMenu();
});
window.addEventListener('resize', () => {
  if (window.innerWidth > 800) closeMenu();
  else updateMenuAccessibility(navigation.classList.contains('open'));
});
updateMenuAccessibility(false);

document.querySelectorAll('.faq-list details').forEach((details) => {
  const summary = details.querySelector('summary');

  summary.addEventListener('click', (event) => {
    event.preventDefault();

    const opening = !details.open || details.classList.contains('is-closing');
    const startHeight = `${details.getBoundingClientRect().height}px`;

    if (details.faqAnimation) details.faqAnimation.cancel();
    details.classList.remove('is-closing');

    if (reducedMotion || typeof details.animate !== 'function') {
      details.classList.remove('is-animating');
      details.style.height = '';
      details.open = opening;
      details.faqAnimation = null;
      return;
    }

    if (opening) details.open = true;
    else details.classList.add('is-closing');

    details.classList.add('is-animating');
    details.style.height = startHeight;

    const endHeight = opening ? `${details.scrollHeight}px` : `${summary.offsetHeight}px`;
    const animation = details.animate([{ height: startHeight }, { height: endHeight }], {
      duration: 320,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });

    details.faqAnimation = animation;
    animation.onfinish = () => {
      if (details.faqAnimation !== animation) return;
      details.open = opening;
      details.classList.remove('is-animating', 'is-closing');
      details.style.height = '';
      details.faqAnimation = null;
    };
  });
});

document.querySelector('#year').textContent = new Date().getFullYear();
if (window.AOS && !reducedMotion) {
  AOS.init({ duration: 750, easing: 'ease-out-cubic', once: false, mirror: true, offset: 70, anchorPlacement: 'top-bottom' });
  document.body.classList.add('animations-ready');
}
const pauseButton = document.querySelector('.banner-pause');
let manuallyPaused = reducedMotion;

function bannerExists(path) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = path;
  });
}

async function discoverBanners() {
  const paths = [];
  const maximumBannerCount = 99;

  for (let number = 1; number <= maximumBannerCount; number += 1) {
    const filename = String(number).padStart(2, '0');
    const path = `assets/banners/${filename}.jpg`;
    if (!(await bannerExists(path))) break;
    paths.push({ filename, path });
  }

  return paths;
}

function renderBanners(banners) {
  const wrapper = document.querySelector('.hero-swiper .swiper-wrapper');

  if (!banners.length) return;

  wrapper.replaceChildren(
    ...banners.map(({ filename, path }) => {
      const slide = document.createElement('div');
      const image = document.createElement('div');
      slide.className = 'swiper-slide';
      image.className = 'banner-image';
      image.style.backgroundImage = `url('${path}')`;
      image.setAttribute('role', 'img');
      image.setAttribute('aria-label', `Banner ${filename} da WF Extintores`);
      slide.append(image);
      return slide;
    }),
  );

  document.querySelector('#total-slides').textContent = String(banners.length).padStart(2, '0');
}

function updatePauseButton() {
  pauseButton.setAttribute('aria-pressed', String(manuallyPaused));
  pauseButton.setAttribute('aria-label', manuallyPaused ? 'Retomar banners' : 'Pausar banners');
  pauseButton.innerHTML = `<i data-lucide="${manuallyPaused ? 'play' : 'pause'}"></i>`;
  if (window.lucide) lucide.createIcons();
}

async function initializeBanners() {
  const banners = await discoverBanners();
  renderBanners(banners);

  const slides = [...document.querySelectorAll('.swiper-slide')];
  if (!slides.length) return;

  if (window.Swiper) {
    const slider = new Swiper('.hero-swiper', {
      loop: slides.length > 1,
      effect: 'fade',
      fadeEffect: { crossFade: true },
      speed: reducedMotion ? 0 : 800,
      autoplay: reducedMotion ? false : { delay: 5000, disableOnInteraction: false, waitForTransition: false },
      navigation: { nextEl: '.banner-next', prevEl: '.banner-prev' },
      a11y: { enabled: true, prevSlideMessage: 'Banner anterior', nextSlideMessage: 'Próximo banner' },
      on: {
        slideChange: function () {
          document.querySelector('#current-slide').textContent = String(this.realIndex + 1).padStart(2, '0');
        },
        autoplayTimeLeft: function (swiper, time, progress) {
          document.querySelector('.hero-progress span').style.width = `${(1 - progress) * 100}%`;
        },
      },
    });
    pauseButton.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      if (manuallyPaused) slider.autoplay.stop();
      else slider.autoplay.start();
      updatePauseButton();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) slider.autoplay.stop();
      else if (!manuallyPaused) slider.autoplay.start();
    });
    updatePauseButton();
  } else {
    // Navegação de reserva para quando o CDN do Swiper estiver indisponível.
    let index = 0;
    function showSlide(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach((slide, i) => {
        slide.style.position = 'absolute';
        slide.style.inset = '0';
        slide.style.opacity = i === index ? '1' : '0';
        slide.classList.toggle('swiper-slide-active', i === index);
      });
      document.querySelector('#current-slide').textContent = String(index + 1).padStart(2, '0');
    }
    showSlide(0);
    document.querySelector('.banner-next').addEventListener('click', () => showSlide(index + 1));
    document.querySelector('.banner-prev').addEventListener('click', () => showSlide(index - 1));
    pauseButton.addEventListener('click', () => {
      manuallyPaused = !manuallyPaused;
      updatePauseButton();
    });
    setInterval(() => {
      if (!manuallyPaused && !document.hidden) showSlide(index + 1);
    }, 3000);
    updatePauseButton();
  }
}

initializeBanners();
