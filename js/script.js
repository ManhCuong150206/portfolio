'use strict';

(() => {
  const EMAILJS_CONFIG = { enabled: false, serviceId: '', templateId: '', publicKey: '' };
  const THEMES = ['midnight', 'dracula', 'nord', 'sage'];

  function readPreference(key, fallback) {
    try { return localStorage.getItem(`cmc-${key}`) || fallback; }
    catch { return fallback; }
  }

  function savePreference(key, value) {
    try { localStorage.setItem(`cmc-${key}`, value); }
    catch { /* The website still works when browser storage is unavailable. */ }
  }

  // This short branch runs synchronously in <head>; the deferred execution initializes the page.
  if (document.currentScript?.hasAttribute('data-bootstrap')) {
    const savedTheme = readPreference('theme', 'midnight');
    document.documentElement.dataset.theme = THEMES.includes(savedTheme) ? savedTheme : 'midnight';
    document.documentElement.classList.add('js');
    return;
  }

  document.addEventListener('DOMContentLoaded', init, { once: true });

  function init() {
    const root = document.documentElement;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
    const mobileViewport = matchMedia('(max-width: 767px)');
    const menuButton = document.querySelector('#menu-toggle');
    const menuPanel = document.querySelector('#nav-panel');
    const header = document.querySelector('#header');
    const themePanel = document.querySelector('#theme-panel');
    const themeButton = document.querySelector('#theme-toggle');
    const languageButton = document.querySelector('#language-toggle');
    const motionButton = document.querySelector('#motion-toggle');
    const modal = document.querySelector('#project-modal');
    const form = document.querySelector('#contact-form');
    const submitButton = document.querySelector('#submit-button');
    const cards = [...document.querySelectorAll('.project-card')];
    const languagePreference = readPreference('language', 'vi');
    let language = ['vi', 'en'].includes(languagePreference) ? languagePreference : 'vi';
    let motionPaused = readPreference('motion', 'running') === 'paused';
    let typingTimer;
    let currentProject = null;
    let previousFocus = null;
    let particleFrame = 0;
    let filterRevision = 0;
    let sending = false;
    let currentFilter = 'all';

    // Vietnamese is collected from the semantic HTML, keeping one source of content.
    // EDIT: Translate the project samples and university placeholders below when you replace their VI copy.
    // EDIT: Confirm the three course dates in EN together with their VI dates.
    const translations = {
      "vi": {
        "hero.note": "Từ dữ liệu.\nĐến hệ thống.",
        "menu.close": "Đóng menu",
        "theme.changed": "Đã chuyển giao diện sang {theme}.",
        "motion.pause": "Tạm dừng hiệu ứng",
        "motion.play": "Bật lại hiệu ứng",
        "motion.reduced": "Đã giảm chuyển động theo thiết bị",
        "form.nameError": "Vui lòng nhập tên có ít nhất 2 ký tự.",
        "form.emailError": "Vui lòng nhập một địa chỉ email hợp lệ.",
        "form.messageError": "Lời nhắn cần có ít nhất 10 ký tự.",
        "form.sending": "Đang gửi…",
        "form.success": "Đã gửi lời nhắn thành công. Cảm ơn bạn đã liên hệ!",
        "form.demoSuccess": "Mô phỏng thành công! Chưa có email nào được gửi. Bạn có thể liên hệ trực tiếp qua email.",
        "form.failure": "Chưa gửi được lời nhắn. Hãy thử lại hoặc gửi email trực tiếp.",
        "form.liveNote": "Lời nhắn được gửi qua EmailJS. Thông tin chỉ được dùng để trả lời bạn.",
        "projects.count": "Đang hiển thị {count} dự án.",
        "easter.egg": "↑ ↑ ↓ ↓ ← → ← → B A — Đã mở khóa chế độ retro. Hello, fellow developer!",
        "close": "Đóng",
        "toast.close": "Đóng thông báo",
        "meta.description": "Portfolio của Chúc Mạnh Cường (CMC) — sinh viên Công nghệ thông tin, định hướng Backend Developer C#/.NET và PHP Laravel, tìm kiếm cơ hội thực tập Backend.",
        "meta.social": "Từ dữ liệu đến hệ thống. Khám phá dự án, kỹ năng và hành trình học Backend C#/.NET của Chúc Mạnh Cường (CMC)."
      },
      "en": {
        "skip": "Skip to content",
        "nav.label": "Main navigation",
        "nav.logo": "CMC — home",
        "nav.home": "Home",
        "nav.about": "About",
        "nav.skills": "Skills",
        "nav.experience": "Experience",
        "nav.projects": "Projects",
        "nav.education": "Education",
        "nav.contact": "Contact",
        "menu.open": "Open menu",
        "menu.close": "Close menu",
        "hero.intro": "Hello, I'm CMC",
        "hero.available": "Open to internship opportunities",
        "hero.roles": "Backend Developer, C# .NET Developer, Laravel Developer, Data Science Student",
        "hero.description": "An ambitious Backend Developer with expertise in C# .NET and PHP Laravel.",
        "hero.projects": "View Projects",
        "hero.contact": "Contact Me",
        "hero.note": "From data.\nTo systems.",
        "hero.location": "Vietnam",
        "hero.scroll": "Explore my journey",
        "about.title": "Behind the code.",
        "about.alt": "Portrait of Chúc Mạnh Cường (CMC)",
        "about.subtitle": "Chúc Mạnh Cường | Aspiring C#/.NET Backend Developer",
        "about.p1": "I am Chúc Mạnh Cường, an Information Technology student focusing on Backend development with C# and .NET. I am learning and practicing application development with ASP.NET Core, Entity Framework Core, and SQL Server, working toward designing my own APIs and implementing business logic for real-world problems.",
        "about.p2": "I enjoy learning through projects: understanding how code works and seeing problems through to a solution. In a team, I proactively divide tasks, communicate with teammates, and review results so we can achieve our goals together.",
        "about.goalLabel": "Career goal",
        "about.goal": "I hope to find a C#/.NET Backend internship where I can contribute to real projects, learn from experienced developers, and gradually become a responsible developer with solid foundations.",
        "stats.projects": "Personal projects",
        "skills.title": "Tools I build with.",
        "skills.intro": "Technologies I am learning and using.",
        "skills.tools": "Tools",
        "level.proficient": "Proficient",
        "level.intermediate": "Intermediate",
        "experience.title": "Experience in the real world.",
        "projects.title": "Ideas, made real.",
        "projects.intro": "Personal projects I have worked on.",
        "projects.filter": "Filter projects by technology",
        "projects.all": "All",
        "projects.live": "Live Demo",
        "projects.source": "Source code",
        "projects.count": "Showing {count} projects.",
        "education.title": "Always a student.",
        "education.intro": "Technical foundations today. New possibilities tomorrow.",
        "education.diploma": "Education",
        "education.certificate": "Certification",
        "education.adse.date": "Sep 2024 — Present",
        "education.ai.detail": "Prompt engineering, RAG pipelines, and LLM integration.",
        "contact.title": "Let’s build something meaningful.",
        "contact.intro": "Looking for a curious Backend intern? I’d love to hear about your team and the projects you’re building.",
        "contact.sign": "A good conversation is where it starts.",
        "form.name": "Your name",
        "form.email": "Email",
        "form.message": "Message",
        "form.namePlaceholder": "What should I call you?",
        "form.emailPlaceholder": "you@example.com",
        "form.messagePlaceholder": "Tell me about your opportunity or idea…",
        "form.send": "Send Message",
        "form.sending": "Sending…",
        "form.demoNote": "Demo mode: this form simulates sending. To get in touch, please email me directly.",
        "form.liveNote": "Your message is sent through EmailJS. Your details are only used to reply.",
        "form.nameError": "Please enter a name with at least 2 characters.",
        "form.emailError": "Please enter a valid email address.",
        "form.messageError": "Please write a message with at least 10 characters.",
        "form.success": "Message sent successfully. Thank you for getting in touch!",
        "form.demoSuccess": "Simulation successful! No email was sent. You can reach me directly by email.",
        "form.failure": "Your message could not be sent. Please try again or email me directly.",
        "footer.built": "Built with 💻 and ☕",
        "theme.label": "Change theme",
        "theme.title": "Make yourself at home.",
        "theme.subtitle": "Choose your space to explore.",
        "theme.changed": "Switched to the {theme} theme.",
        "top": "Back to top",
        "close": "Close",
        "modal.close": "Close project details",
        "toast.close": "Dismiss notification",
        "motion.pause": "Pause animations",
        "motion.play": "Resume animations",
        "motion.reduced": "Reduced motion follows your device",
        "easter.egg": "↑ ↑ ↓ ↓ ← → ← → B A — Retro mode unlocked. Hello, fellow developer!",
        "meta.description": "Portfolio of Chúc Mạnh Cường (CMC) — an Information Technology student pursuing Backend development with C#/.NET and PHP Laravel, seeking a Backend internship.",
        "meta.social": "From data to systems. Explore the projects, skills, and C#/.NET Backend learning journey of Chúc Mạnh Cường (CMC).",
        "stats.skills": "Technical skills",
        "stats.education": "Education & certifications",
        "experience.empty": "I do not have work experience yet. I will update this section when I do.",
        "education.university.title": "Information Technology — Major in Data Science",
        "education.university.school": "[University name]",
        "education.university.date": "[Start year] — Present",
        "education.university.detail": "[Brief description of the degree program]",
        "education.adse.title": "Advanced Diploma in Software Engineering",
        "education.adse.school": "Aptech Computer Education",
        "education.adse.detail": "A comprehensive program covering software development methodologies, programming languages, and database management.",
        "education.ai.title": "Practical Generative AI for Developers",
        "education.ai.school": "Aptech Global Academy",
        "education.ai.date": "Sep 2025",
        "education.everyone.title": "Practical Generative AI for Everyone",
        "education.everyone.school": "Aptech Global Academy",
        "education.everyone.date": "Aug 2025",
        "education.everyone.detail": "A comprehensive introduction to Generative AI workflows, including practical applications and ethical implementation.",
        "projects.project1.title": "[Project 1 name]",
        "projects.project1.meta": "Personal Project | [Dates]",
        "projects.project1.description": "[Describe the project in 2–3 sentences]",
        "projects.project1.alt": "Preview of [Project 1 name]",
        "projects.project2.title": "[Project 2 name]",
        "projects.project2.meta": "Personal Project | [Dates]",
        "projects.project2.description": "[Describe the project in 2–3 sentences]",
        "projects.project2.alt": "Preview of [Project 2 name]",
        "projects.project3.title": "[Project 3 name]",
        "projects.project3.meta": "Personal Project | [Dates]",
        "projects.project3.description": "[Describe the project in 2–3 sentences]",
        "projects.project3.alt": "Preview of [Project 3 name]"
      }
    };

    function collectVietnamese() {
      const attributes = [['data-i18n', null], ['data-i18n-aria', 'aria-label'], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-alt', 'alt']];
      attributes.forEach(([attribute, target]) => {
        document.querySelectorAll(`[${attribute}]`).forEach(element => {
          const key = element.getAttribute(attribute);
          if (!(key in translations.vi)) translations.vi[key] = target ? element.getAttribute(target) : element.textContent.trim();
        });
      });
    }

    function t(key, replacements = {}) {
      let value = translations[language][key] ?? translations.vi[key] ?? key;
      Object.entries(replacements).forEach(([name, replacement]) => { value = value.replaceAll(`{${name}}`, String(replacement)); });
      return value;
    }

    function setLanguage(nextLanguage) {
      language = nextLanguage;
      root.lang = language;
      const attributes = [['data-i18n', null], ['data-i18n-aria', 'aria-label'], ['data-i18n-placeholder', 'placeholder'], ['data-i18n-alt', 'alt']];
      attributes.forEach(([attribute, target]) => {
        document.querySelectorAll(`[${attribute}]`).forEach(element => {
          const value = t(element.getAttribute(attribute));
          if (target) element.setAttribute(target, value);
          else element.textContent = value;
        });
      });
      languageButton.firstChild.textContent = language === 'vi' ? 'EN ' : 'VI ';
      languageButton.setAttribute('aria-label', language === 'vi' ? 'Switch to English' : 'Chuyển sang tiếng Việt');
      menuButton.setAttribute('aria-label', t(menuPanel.classList.contains('open') ? 'menu.close' : 'menu.open'));
      document.querySelector('meta[name="description"]').content = t('meta.description');
      document.querySelector('meta[property="og:description"]').content = t('meta.social');
      document.querySelector('meta[name="twitter:description"]').content = t('meta.social');
      document.querySelector('meta[property="og:locale"]').content = language === 'vi' ? 'vi_VN' : 'en_US';
      const formNote = document.querySelector('#form-note');
      formNote.dataset.i18n = EMAILJS_CONFIG.enabled ? 'form.liveNote' : 'form.demoNote';
      formNote.textContent = t(formNote.dataset.i18n);
      submitButton.querySelector('span').textContent = t(sending ? 'form.sending' : 'form.send');
      form.querySelectorAll('[aria-invalid="true"]').forEach(field => validateField(field));
      updateMotionControl();
      updateFilterStatus();
      restartTyping();
      if (currentProject) renderModal(currentProject);
      savePreference('language', language);
    }

    function setTheme(theme, announce = false) {
      if (!THEMES.includes(theme)) return;
      root.dataset.theme = theme;
      document.querySelectorAll('[data-set-theme]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setTheme === theme)));
      document.querySelector('meta[name="theme-color"]').content = getComputedStyle(root).getPropertyValue('--bg').trim();
      savePreference('theme', theme);
      if (announce) toast('theme.changed', 'info', { theme: theme[0].toUpperCase() + theme.slice(1) });
    }

    function toggleThemePanel(open, restoreFocus = false) {
      themePanel.hidden = !open;
      themeButton.setAttribute('aria-expanded', String(open));
      if (open) themePanel.querySelector('[aria-pressed="true"]').focus();
      else if (restoreFocus) themeButton.focus();
    }

    function toggleMenu(open, restoreFocus = false) {
      menuPanel.classList.toggle('open', open);
      header.classList.toggle('menu-open', open);
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', t(open ? 'menu.close' : 'menu.open'));
      menuPanel.inert = mobileViewport.matches && !open;
      if (open) menuPanel.querySelector('a').focus();
      else if (restoreFocus) menuButton.focus();
    }

    function setupNavigation() {
      menuButton.addEventListener('click', () => toggleMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
      menuPanel.querySelectorAll('a').forEach(link => link.addEventListener('click', () => toggleMenu(false)));
      mobileViewport.addEventListener('change', () => toggleMenu(false));
      toggleMenu(false);
      document.addEventListener('pointerdown', event => {
        if (!header.contains(event.target)) toggleMenu(false);
        if (!themePanel.contains(event.target) && !themeButton.contains(event.target)) toggleThemePanel(false);
      });
      document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
          if (menuPanel.classList.contains('open')) toggleMenu(false, true);
          if (!themePanel.hidden) toggleThemePanel(false, true);
        }
      });
      const sections = [...document.querySelectorAll('main > section')];
      const navLinks = [...document.querySelectorAll('.nav-links a')];
      const backToTop = document.querySelector('#back-to-top');
      let scrollQueued = false;
      function updateScrollState() {
        scrollQueued = false;
        header.classList.toggle('scrolled', scrollY > 50);
        backToTop.hidden = scrollY <= 500;
        let active = sections[0].id;
        sections.forEach(section => { if (section.getBoundingClientRect().top <= 160) active = section.id; });
        if (innerHeight + scrollY >= document.documentElement.scrollHeight - 5) active = sections.at(-1).id;
        navLinks.forEach(link => {
          const isActive = link.hash === `#${active}`;
          link.classList.toggle('active', isActive);
          if (isActive) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
      window.addEventListener('scroll', () => {
        if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScrollState); }
      }, { passive: true });
      window.addEventListener('resize', updateScrollState, { passive: true });
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: shouldAnimate() ? 'smooth' : 'instant' });
        document.querySelector('.nav .logo').focus({ preventScroll: true });
      });
      updateScrollState();
    }

    function shouldAnimate() { return !reducedMotion.matches && !motionPaused && !document.hidden; }

    function updateMotionControl() {
      motionButton.textContent = t(reducedMotion.matches ? 'motion.reduced' : motionPaused ? 'motion.play' : 'motion.pause');
      motionButton.disabled = reducedMotion.matches;
      motionButton.setAttribute('aria-pressed', String(motionPaused || reducedMotion.matches));
      root.classList.toggle('motion-paused', motionPaused);
      if (!shouldAnimate()) document.body.classList.remove('cursor-active');
    }

    function restartTyping() {
      clearTimeout(typingTimer);
      const roles = translations[language]['hero.roles'].split(', ');
      const target = document.querySelector('#typing-text');
      let roleIndex = 0;
      let characterIndex = roles[0].length;
      let deleting = true;
      target.textContent = roles[0];
      if (!shouldAnimate()) return;
      function typeNextCharacter() {
        if (!shouldAnimate()) return;
        const role = roles[roleIndex];
        characterIndex += deleting ? -1 : 1;
        target.textContent = role.slice(0, characterIndex);
        let delay = deleting ? 35 : 75;
        if (!deleting && characterIndex === role.length) { deleting = true; delay = 1900; }
        else if (deleting && characterIndex === 0) { deleting = false; roleIndex = (roleIndex + 1) % roles.length; delay = 300; }
        typingTimer = setTimeout(typeNextCharacter, delay);
      }
      typingTimer = setTimeout(typeNextCharacter, 2200);
    }

    function animateCounter(element) {
      const finalValue = Number(element.dataset.count);
      if (!shouldAnimate()) { element.textContent = String(finalValue); return; }
      const started = performance.now();
      function tick(now) {
        const progress = Math.min((now - started) / 1400, 1);
        element.textContent = String(Math.round(finalValue * (1 - (1 - progress) ** 3)));
        if (progress < 1 && shouldAnimate()) requestAnimationFrame(tick);
        else element.textContent = String(finalValue);
      }
      requestAnimationFrame(tick);
    }

    function setupReveal() {
      const elements = document.querySelectorAll('.reveal');
      function reveal(element) {
        element.classList.add('is-visible');
        element.querySelectorAll('[data-count]').forEach(animateCounter);
      }
      if (!('IntersectionObserver' in window)) { elements.forEach(reveal); return; }
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          reveal(entry.target);
          observer.unobserve(entry.target);
        });
      }, { threshold: .12 });
      elements.forEach(element => observer.observe(element));
    }

    function updateFilterStatus() {
      const count = cards.filter(card => currentFilter === 'all' || card.dataset.tech.split(' ').includes(currentFilter)).length;
      document.querySelector('#filter-status').textContent = t('projects.count', { count });
    }

    async function filterProjects(filter) {
      currentFilter = filter;
      const revision = ++filterRevision;
      document.querySelectorAll('[data-filter]').forEach(button => {
        const active = button.dataset.filter === filter;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      cards.forEach(card => { card.classList.remove('filter-in'); if (!card.hidden) card.classList.add('filter-out'); });
      if (shouldAnimate()) await delay(parseFloat(getComputedStyle(root).getPropertyValue('--normal')) || 320);
      if (revision !== filterRevision) return;
      cards.forEach(card => {
        card.hidden = filter !== 'all' && !card.dataset.tech.split(' ').includes(filter);
        card.classList.remove('filter-out');
        if (!card.hidden) card.classList.add('filter-in');
      });
      updateFilterStatus();
    }

    function renderModal(projectId) {
      const card = cards.find(item => item.dataset.project === projectId);
      if (!card) return;
      const title = card.querySelector('.project-open').childNodes[0].textContent.trim();
      const sourceImage = card.querySelector('img');
      const modalImage = document.querySelector('#modal-image');
      document.querySelector('#modal-title').textContent = title;
      document.querySelector('#modal-image-fallback').textContent = title.split(' — ')[0];
      document.querySelector('#modal-meta').textContent = card.querySelector('.project-meta').textContent;
      document.querySelector('#modal-description').textContent = card.querySelector('.project-description').textContent;
      modalImage.alt = sourceImage.alt;
      modalImage.classList.toggle('image-missing', sourceImage.classList.contains('image-missing'));
      if (sourceImage.classList.contains('image-missing')) modalImage.removeAttribute('src');
      else modalImage.setAttribute('src', sourceImage.getAttribute('src'));
      document.querySelector('#modal-tags').replaceChildren(...[...card.querySelectorAll('.tags li')].map(tag => tag.cloneNode(true)));
      document.querySelector('#modal-links').replaceChildren(...[...card.querySelectorAll('.project-links a')].map((link, index) => {
        const copy = link.cloneNode(true);
        copy.className = `button ${index === 0 ? 'button-primary' : 'button-secondary'}`;
        return copy;
      }));
    }

    function openModal(projectId, trigger) {
      currentProject = projectId;
      previousFocus = trigger;
      toggleThemePanel(false);
      renderModal(projectId);
      modal.showModal();
      document.body.classList.add('scroll-locked');
      document.querySelector('#modal-close').focus();
    }

    function closeModal() { modal.close(); }

    function setupProjects() {
      document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => filterProjects(button.dataset.filter)));
      cards.forEach(card => {
        card.addEventListener('click', event => {
          if (event.target.closest('a')) return;
          if (window.getSelection()?.toString()) return;
          openModal(card.dataset.project, card.querySelector('.project-open'));
        });
      });
      document.querySelector('#modal-close').addEventListener('click', closeModal);
      modal.addEventListener('click', event => { if (event.target === modal) closeModal(); });
      modal.addEventListener('close', () => {
        currentProject = null;
        document.body.classList.remove('scroll-locked');
        previousFocus?.focus({ preventScroll: true });
      });
      modal.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const focusable = [...modal.querySelectorAll('button, a[href]')];
        const first = focusable[0];
        const last = focusable.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      });
    }

    function setupImageFallbacks() {
      document.querySelectorAll('.image-frame img').forEach(img => {
        img.addEventListener('error', () => img.classList.add('image-missing'));
        img.addEventListener('load', () => img.classList.remove('image-missing'));
        if (img.hasAttribute('src') && img.complete && !img.naturalWidth) img.classList.add('image-missing');
      });
    }

    function toast(key, type = 'info', replacements = {}) {
      const container = document.querySelector('#toast-container');
      container.querySelectorAll('.toast').forEach(existing => {
        if (existing.dataset.toastKey === key) existing.querySelector('button').click();
      });
      const item = document.createElement('div');
      item.className = `toast ${type}`;
      item.dataset.toastKey = key;
      const message = document.createElement('p');
      message.textContent = t(key, replacements);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'icon-button';
      close.textContent = '×';
      close.setAttribute('aria-label', t('toast.close'));
      item.append(message, close);
      container.append(item);
      let remaining = 4000;
      let started = performance.now();
      let timer;
      let hovered = false;
      let focused = false;
      function removeToast() { clearTimeout(timer); item.remove(); }
      function pauseToast() { clearTimeout(timer); remaining = Math.max(0, remaining - (performance.now() - started)); }
      function resumeToast() {
        if (hovered || focused) return;
        started = performance.now();
        clearTimeout(timer);
        timer = setTimeout(removeToast, remaining);
      }
      item.addEventListener('pointerenter', () => { if (!focused) pauseToast(); hovered = true; });
      item.addEventListener('pointerleave', () => { hovered = false; resumeToast(); });
      item.addEventListener('focusin', () => { if (!hovered && !focused) pauseToast(); focused = true; });
      item.addEventListener('focusout', () => { focused = false; resumeToast(); });
      close.addEventListener('click', removeToast);
      resumeToast();
    }

    function validateField(field) {
      const value = field.value.trim();
      const validators = {
        name: value.length >= 2,
        email: /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/.test(value),
        message: value.length >= 10
      };
      const valid = validators[field.id];
      document.querySelector(`#${field.id}-error`).textContent = valid ? '' : t(`form.${field.id}Error`);
      field.setAttribute('aria-invalid', String(!valid));
      return valid;
    }

    function delay(milliseconds) { return new Promise(resolve => setTimeout(resolve, milliseconds)); }

    function loadEmailSDK() {
      if (window.emailjs?.sendForm) return Promise.resolve(window.emailjs);
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        // This optional SDK is requested only after EMAILJS_CONFIG.enabled is explicitly enabled.
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
        script.async = true;
        const timeout = setTimeout(() => { script.remove(); reject(new Error('Email SDK timeout')); }, 15000);
        script.onload = () => { clearTimeout(timeout); window.emailjs?.sendForm ? resolve(window.emailjs) : reject(new Error('Email SDK unavailable')); };
        script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('Email SDK failed to load')); };
        document.head.append(script);
      });
    }

    async function sendMessage(event) {
      event.preventDefault();
      if (sending) return;
      const fields = [...form.querySelectorAll('input, textarea')];
      fields.forEach(field => { field.value = field.value.trim(); });
      const invalidFields = fields.filter(field => !validateField(field));
      if (invalidFields.length) { invalidFields[0].focus(); return; }
      sending = true;
      submitButton.disabled = true;
      submitButton.setAttribute('aria-busy', 'true');
      submitButton.querySelector('span').textContent = t('form.sending');
      // Keep edits from being lost while the submitted message is in flight.
      fields.forEach(field => { field.readOnly = true; });
      try {
        if (EMAILJS_CONFIG.enabled) {
          if (!EMAILJS_CONFIG.serviceId || !EMAILJS_CONFIG.templateId || !EMAILJS_CONFIG.publicKey) throw new Error('EmailJS configuration is incomplete');
          const emailjs = await loadEmailSDK();
          await emailjs.sendForm(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateId, form, { publicKey: EMAILJS_CONFIG.publicKey });
        } else await delay(1000);
        toast(EMAILJS_CONFIG.enabled ? 'form.success' : 'form.demoSuccess', 'success');
        form.reset();
        fields.forEach(field => { field.removeAttribute('aria-invalid'); });
      } catch {
        toast('form.failure', 'error');
      } finally {
        sending = false;
        submitButton.disabled = false;
        submitButton.removeAttribute('aria-busy');
        submitButton.querySelector('span').textContent = t('form.send');
        fields.forEach(field => { field.readOnly = false; });
      }
    }

    function setupForm() {
      form.addEventListener('submit', sendMessage);
      form.querySelectorAll('input, textarea').forEach(field => field.addEventListener('input', () => {
        field.removeAttribute('aria-invalid');
        document.querySelector(`#${field.id}-error`).textContent = '';
      }));
    }

    function setupParticles() {
      const canvas = document.querySelector('#particles');
      const context = canvas.getContext('2d');
      if (!context) return () => { };
      let particles = [];
      let width = 0;
      let height = 0;
      let lastFrame = 0;
      function resizeCanvas() {
        width = innerWidth;
        height = innerHeight;
        const ratio = Math.min(devicePixelRatio || 1, 2);
        canvas.width = width * ratio;
        canvas.height = height * ratio;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        particles = Array.from({ length: width < 768 ? 50 : 100 }, () => ({
          x: Math.random() * width, y: Math.random() * height,
          vx: (Math.random() - .5) * .15, vy: -.08 - Math.random() * .15,
          radius: .5 + Math.random() * 1.1
        }));
      }
      function draw(now) {
        particleFrame = 0;
        if (!shouldAnimate()) return;
        const timeStep = Math.min((now - lastFrame) / 16.67 || 1, 2);
        lastFrame = now;
        context.clearRect(0, 0, width, height);
        context.fillStyle = getComputedStyle(root).getPropertyValue('--accent').trim();
        particles.forEach(particle => {
          particle.x = (particle.x + particle.vx * timeStep + width) % width;
          particle.y = (particle.y + particle.vy * timeStep + height) % height;
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();
        });
        particleFrame = requestAnimationFrame(draw);
      }
      function syncParticles() {
        cancelAnimationFrame(particleFrame);
        particleFrame = 0;
        context.clearRect(0, 0, width, height);
        lastFrame = performance.now();
        if (shouldAnimate()) particleFrame = requestAnimationFrame(draw);
      }
      let resizeTimer;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => { resizeCanvas(); syncParticles(); }, 150);
      }, { passive: true });
      resizeCanvas();
      syncParticles();
      return syncParticles;
    }

    function setupPointerEffects() {
      const dot = document.querySelector('.cursor-dot');
      const ring = document.querySelector('.cursor-ring');
      let pointerFrame = 0;
      document.addEventListener('pointermove', event => {
        if (!finePointer.matches || !shouldAnimate() || event.pointerType === 'touch') return;
        cancelAnimationFrame(pointerFrame);
        pointerFrame = requestAnimationFrame(() => {
          document.body.classList.add('cursor-active');
          dot.style.transform = `translate3d(${event.clientX - 2}px, ${event.clientY - 2}px, 0)`;
          ring.style.transform = `translate3d(${event.clientX - 14}px, ${event.clientY - 14}px, 0)`;
        });
      }, { passive: true });
      document.documentElement.addEventListener('pointerleave', () => document.body.classList.remove('cursor-active'));
      window.addEventListener('blur', () => document.body.classList.remove('cursor-active'));
      cards.forEach(card => {
        card.addEventListener('pointermove', event => {
          if (!finePointer.matches || !shouldAnimate()) return;
          const box = card.getBoundingClientRect();
          card.style.setProperty('--tilt-x', `${((event.clientY - box.top) / box.height - .5) * -4}deg`);
          card.style.setProperty('--tilt-y', `${((event.clientX - box.left) / box.width - .5) * 4}deg`);
        }, { passive: true });
        card.addEventListener('pointerleave', () => { card.style.removeProperty('--tilt-x'); card.style.removeProperty('--tilt-y'); });
      });
    }

    function setupEasterEgg() {
      const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
      let progress = 0;
      let effectTimer;
      document.addEventListener('keydown', event => {
        if (event.target.closest('input, textarea, [contenteditable="true"]') || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
        progress = key === sequence[progress] ? progress + 1 : key === sequence[0] ? 1 : 0;
        if (progress !== sequence.length) return;
        progress = 0;
        toast('easter.egg', 'info');
        if (shouldAnimate()) {
          clearTimeout(effectTimer);
          document.body.classList.add('retro');
          effectTimer = setTimeout(() => document.body.classList.remove('retro'), 1000);
        }
      });
    }

    function setupLoader() {
      const loader = document.querySelector('.loader');
      function finishLoading() { loader.classList.add('is-loaded'); }
      if (document.readyState === 'complete') finishLoading();
      else window.addEventListener('load', finishLoading, { once: true });
      setTimeout(finishLoading, 2500);
    }

    collectVietnamese();
    setupImageFallbacks();
    setupNavigation();
    setupProjects();
    setupForm();
    setupPointerEffects();
    setupEasterEgg();
    setupLoader();
    document.querySelector('#year').textContent = String(new Date().getFullYear());
    setTheme(root.dataset.theme || 'midnight');
    setLanguage(language);
    setupReveal();
    const syncParticles = setupParticles();

    languageButton.addEventListener('click', () => setLanguage(language === 'vi' ? 'en' : 'vi'));
    themeButton.addEventListener('click', () => toggleThemePanel(themePanel.hidden));
    document.querySelector('#theme-close').addEventListener('click', () => toggleThemePanel(false, true));
    document.querySelectorAll('[data-set-theme]').forEach(button => button.addEventListener('click', () => setTheme(button.dataset.setTheme, true)));
    motionButton.addEventListener('click', () => {
      motionPaused = !motionPaused;
      savePreference('motion', motionPaused ? 'paused' : 'running');
      updateMotionControl();
      restartTyping();
      syncParticles();
    });
    reducedMotion.addEventListener('change', () => { updateMotionControl(); restartTyping(); syncParticles(); });
    document.addEventListener('visibilitychange', () => { restartTyping(); syncParticles(); });
  }
})();
