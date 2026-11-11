// TechPA Bilingual Frontend Application (Tiếng Việt & English Toggle)

let currentLang = localStorage.getItem('techpa_lang') || 'vi';
let allContent = null;

const SVG_ICONS = {
  cloud: '<path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>',
  'shield-check': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path>',
  code: '<polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline>',
  cpu: '<rect width="16" height="16" x="4" y="4" rx="2"></rect><rect width="6" height="6" x="9" y="9" rx="1"></rect><path d="M15 2v2"></path><path d="M15 20v2"></path><path d="M2 15h2"></path><path d="M2 9h2"></path><path d="M20 15h2"></path><path d="M20 9h2"></path><path d="M9 2v2"></path><path d="M9 20v2"></path>',
  server: '<rect width="20" height="8" x="2" y="2" rx="2"></rect><rect width="20" height="8" x="2" y="14" rx="2"></rect><line x1="6" x2="6.01" y1="6" y2="6"></line><line x1="6" x2="6.01" y1="18" y2="18"></line>',
  'bar-chart-3': '<path d="M3 3v18h18"></path><path d="M18 17V9"></path><path d="M13 17V5"></path><path d="M8 17v-3"></path>'
};

function getIconSvg(name) {
  return `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG_ICONS[name] || SVG_ICONS.cloud}</svg>`;
}

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('techpa_lang', lang);
  renderContent();
  updateLangSwitchUI();
}

function updateLangSwitchUI() {
  const switchBox = document.getElementById('langSwitcher');
  if (switchBox) {
    switchBox.innerHTML = `
      <button class="lang-btn ${currentLang === 'vi' ? 'active' : ''}" onclick="setLanguage('vi')">VN</button>
      <span class="divider">/</span>
      <button class="lang-btn ${currentLang === 'en' ? 'active' : ''}" onclick="setLanguage('en')">EN</button>
    `;
  }
}

async function loadInitialData() {
  try {
    const res = await fetch('/api/content');
    allContent = await res.json();
    renderContent();
    updateLangSwitchUI();
  } catch (err) {
    console.error('Error loading TechPA content:', err);
  }
}

function renderContent() {
  if (!allContent) return;
  const data = allContent[currentLang] || allContent.vi || allContent;
  const ui = data.ui || {};

  // Document title
  document.title = `${data.brand.name} - ${data.brand.tagline}`;

  // Announcement & Brand
  document.getElementById('announcementText').textContent = data.brand.announcement;
  document.getElementById('barHotline').textContent = data.brand.hotline;
  document.getElementById('contactAddress').textContent = data.brand.address;
  document.getElementById('contactEmail').textContent = data.brand.email;
  document.getElementById('contactHours').textContent = data.brand.workingHours;
  document.getElementById('faqPhone').textContent = data.brand.hotline;
  document.getElementById('faqPhone').href = 'tel:' + data.brand.hotline.replace(/[^0-9]/g, '');

  // Static UI strings
  setText('btnHeaderQuote', ui.btnQuote || 'Nhận báo giá');
  setText('heroTag', ui.heroTag);
  setHtml('heroTitle', `${ui.heroTitle} <span class="highlight-gold">${ui.heroTitleHighlight}</span>`);
  setText('heroDesc', ui.heroDesc);
  setText('btnHeroExplore', ui.btnExplore);
  setText('btnHeroConsult', ui.btnFreeConsult);
  setText('ratingText', ui.ratingText);
  setText('ratingSub', ui.ratingSub);
  setText('badgeSecurity', ui.badgeSecurity);
  setText('badgeSecuritySub', ui.badgeSecuritySub);
  setText('badgeSavings', ui.badgeSavings);
  setText('badgeSavingsSub', ui.badgeSavingsSub);
  setText('partnerHeading', ui.partnerHeading);

  // About Section
  setText('aboutTag', ui.aboutTag);
  setHtml('aboutTitle', `${ui.aboutTitle} <span class="highlight-gold">${ui.aboutTitleHighlight}</span>`);
  setText('aboutDesc', ui.aboutDesc);
  setText('aboutCheck1Title', ui.aboutCheck1Title);
  setText('aboutCheck1Desc', ui.aboutCheck1Desc);
  setText('aboutCheck2Title', ui.aboutCheck2Title);
  setText('aboutCheck2Desc', ui.aboutCheck2Desc);
  setText('btnExpertConsult', ui.btnExpertConsult);
  setText('expNumber', ui.expNumber);
  setText('expText', ui.expText);

  // Services Section
  setText('servicesTag', ui.servicesTag);
  setHtml('servicesTitle', `${ui.servicesTitle} <span class="highlight-gold">${ui.servicesTitleHighlight}</span>`);
  setText('servicesDesc', ui.servicesDesc);

  // Projects Section
  setText('projectsTag', ui.projectsTag);
  setHtml('projectsTitle', `${ui.projectsTitle} <span class="highlight-gold">${ui.projectsTitleHighlight}</span>`);
  setText('btnViewAllProjects', ui.btnViewAllProjects);

  // Pricing Section Bilingual
  setText('pricingTag', currentLang === 'en' ? 'PRICING & PACKAGES' : 'BẢNG GIÁ & GÓI TRIỂN KHAI');
  setHtml('pricingTitle', currentLang === 'en'
    ? 'Choose the Solution Plan <span class="highlight-gold">Tailored to Your Scale</span>'
    : 'Lựa Chọn Gói Giải Pháp <span class="highlight-gold">Phù Hợp Quy Mô</span>');
  setText('pricingDesc', currentLang === 'en'
    ? 'Transparent cost model optimizing enterprise technology infrastructure and cybersecurity operating overhead at every milestone.'
    : 'Mô hình chi phí minh bạch, tối ưu chi phí vận hành hạ tầng công nghệ và bảo mật theo từng giai đoạn phát triển của doanh nghiệp.');

  setText('plan1Tag', currentLang === 'en' ? 'Startup & SMB' : 'Doanh nghiệp vừa & nhỏ');
  setText('plan1Title', currentLang === 'en' ? 'Digital Launchpad (Startup)' : 'Khởi Động Số (Startup & SMB)');
  setText('plan1Desc', currentLang === 'en' ? 'Ideal for companies with under 50 employees establishing foundational cloud and security.' : 'Tối ưu cho doanh nghiệp dưới 50 nhân sự cần số hoá vận hành cơ bản.');
  setText('plan1Price', currentLang === 'en' ? 'From $650' : 'Từ 15.000.000đ');
  setText('plan1Sub', currentLang === 'en' ? '/ project or month' : '/ dự án hoặc tháng');
  setText('plan1Cta', currentLang === 'en' ? 'Select Plan' : 'Chọn Gói Tư Vấn');

  setText('plan2Tag', currentLang === 'en' ? 'Most Popular ★' : 'Phổ Biến Nhất ★');
  setText('plan2Title', currentLang === 'en' ? 'Enterprise Growth' : 'Tăng Tốc Số (Enterprise Growth)');
  setText('plan2Desc', currentLang === 'en' ? 'Full-stack cloud migration, Zero-Trust security, customized ERP, and 24/7 SOC monitoring.' : 'Giải pháp chuyển dịch đám mây toàn diện, bảo mật Zero-Trust & SOC 24/7.');
  setText('plan2Price', currentLang === 'en' ? 'From $1,900' : 'Từ 45.000.000đ');
  setText('plan2Sub', currentLang === 'en' ? '/ project or month' : '/ dự án hoặc tháng');
  setText('plan2Cta', currentLang === 'en' ? 'Request Consultation' : 'Đăng Ký Tư Vấn Ngay');

  setText('plan3Tag', currentLang === 'en' ? 'Enterprise & Corporate' : 'Tập đoàn & Quy mô lớn');
  setText('plan3Title', currentLang === 'en' ? 'Custom Architecture' : 'Kiến Trúc Chuyên Biệt (Custom Architecture)');
  setText('plan3Desc', currentLang === 'en' ? 'Tailor-made multi-cloud ecosystem, AI automation, proprietary ERP, and dedicated 24/7 SLA.' : 'Thiết kế hệ sinh thái công nghệ riêng biệt, bảo mật ngân hàng và chuỗi đa chi nhánh.');
  setText('plan3Price', currentLang === 'en' ? 'Tailored Quote' : 'Thiết Kế Riêng');
  setText('plan3Sub', currentLang === 'en' ? 'Based on audit scope' : 'Theo yêu cầu khảo sát');
  setText('plan3Cta', currentLang === 'en' ? 'Contact Solutions Expert' : 'Liên Hệ Chuyên Gia');

  // FAQ Section
  setText('faqTag', ui.faqTag);
  setHtml('faqTitle', `${ui.faqTitle} <span class="highlight-gold">${ui.faqTitleHighlight}</span>`);
  setText('faqDesc', ui.faqDesc);
  setText('faqDirectTitle', ui.faqDirectTitle);

  // Testimonials Section
  setText('testiTag', ui.testiTag);
  setHtml('testiTitle', `${ui.testiTitle} <span class="highlight-gold">${data.brand.name}</span>`);

  // Contact Section
  setText('contactTag', ui.contactTag);
  setText('contactTitle', ui.contactTitle);
  setText('contactDesc', ui.contactDesc);
  setText('contactAddressLabel', ui.contactAddressLabel);
  setText('contactEmailLabel', ui.contactEmailLabel);
  setText('contactHoursLabel', ui.contactHoursLabel);
  setText('socialConnectTitle', ui.socialConnectTitle);
  setText('contactCardTitle', ui.contactCardTitle);
  setText('contactCardSub', ui.contactCardSub);
  setText('btnSubmit', ui.formSubmitBtn);

  // Contact Form Labels & Dynamic Service Options
  setText('lblFormName', ui.formName || (currentLang === 'en' ? 'Full Name *' : 'Họ và tên *'));
  setText('lblFormEmail', ui.formEmail || (currentLang === 'en' ? 'Business Email *' : 'Email *'));
  setText('lblFormPhone', ui.formPhone || (currentLang === 'en' ? 'Phone Number *' : 'Số điện thoại *'));
  setText('lblFormService', ui.formService || (currentLang === 'en' ? 'Interested Service' : 'Dịch vụ quan tâm'));
  setText('lblFormMessage', ui.formMessage || (currentLang === 'en' ? 'Project Description / Needs' : 'Nội dung yêu cầu'));

  const nameInput = document.querySelector('input[name="name"]');
  if (nameInput) nameInput.placeholder = currentLang === 'en' ? 'John Doe' : 'Nguyễn Văn A';

  const msgArea = document.getElementById('contactMessageInput');
  if (msgArea) {
    msgArea.placeholder = currentLang === 'en'
      ? 'Describe your project requirements or IT infrastructure needs...'
      : 'Mô tả nhu cầu hoặc hiện trạng hệ thống của bạn...';
  }

  const serviceSelect = document.getElementById('contactServiceSelect');
  if (serviceSelect && data.services) {
    serviceSelect.innerHTML = data.services.map((s) => `
      <option value="${s.title}">${s.title}</option>
    `).join('');
  }

  // Footer UI
  setText('footerAboutDesc', ui.footerAboutDesc);
  setText('footerColServices', ui.footerColServices);
  setText('footerColAbout', ui.footerColAbout);
  setText('footerColNewsletter', ui.footerColNewsletter);
  setText('footerNewsletterDesc', ui.footerNewsletterDesc);
  setText('footerNewsletterBtn', ui.footerNewsletterBtn);
  setText('footerCopyright', ui.footerCopyright);
  setText('footerTagline', currentLang === 'en' ? 'Enterprise-grade digital technology ecosystem' : 'Hệ sinh thái công nghệ chuẩn doanh nghiệp số');

  // Footer dynamic service links
  const footerServicesList = document.getElementById('footerServicesList');
  if (footerServicesList && data.services) {
    footerServicesList.innerHTML = data.services.slice(0, 5).map((s) => `
      <li><a href="#services">${s.title}</a></li>
    `).join('');
  }

  // Footer dynamic about links
  const footerAboutList = document.getElementById('footerAboutList');
  if (footerAboutList) {
    footerAboutList.innerHTML = currentLang === 'en' ? `
      <li><a href="#about">About TechPA</a></li>
      <li><a href="#projects">Case Studies</a></li>
      <li><a href="#faqs">FAQ</a></li>
      <li><a href="#contact">Contact Us</a></li>
    ` : `
      <li><a href="#about">Giới thiệu công ty</a></li>
      <li><a href="#projects">Dự án đã triển khai</a></li>
      <li><a href="#faqs">Câu hỏi thường gặp</a></li>
      <li><a href="#contact">Liên hệ hợp tác</a></li>
    `;
  }

  // Navigation Links
  const mainNav = document.getElementById('mainNav');
  if (mainNav && data.nav) {
    mainNav.innerHTML = data.nav.map((item, idx) => `
      <a href="${item.link}" class="nav-link ${idx === 0 ? 'active' : ''}">
        ${item.label}
        ${item.badge ? `<span class="nav-badge ${item.badgeColor || ''}">${item.badge}</span>` : ''}
      </a>
    `).join('');
  }

  // Floating Buttons
  const cleanPhone = data.brand.hotline.replace(/[^0-9]/g, '');
  if (document.getElementById('floatingPhone')) {
    document.getElementById('floatingPhone').href = 'tel:' + cleanPhone;
  }
  if (document.getElementById('floatingZalo') && data.socials?.zalo) {
    document.getElementById('floatingZalo').href = data.socials.zalo;
  }

  // Social Connect Buttons
  const socialButtons = document.getElementById('socialButtons');
  if (socialButtons && data.socials) {
    socialButtons.innerHTML = `
      <a href="${data.socials.zalo || '#'}" target="_blank" class="social-btn zalo">
        <span class="btn-icon">Zalo</span> ${ui.chatZalo || 'Chat Zalo'}
      </a>
      <a href="${data.socials.facebook || '#'}" target="_blank" class="social-btn fb">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        Facebook Fanpage
      </a>
      <a href="${data.socials.linkedin || '#'}" target="_blank" class="social-btn in">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        LinkedIn
      </a>
    `;
  }

  // Footer Social links
  const footerSocials = document.getElementById('footerSocials');
  if (footerSocials && data.socials) {
    footerSocials.innerHTML = `
      <a href="${data.socials.zalo || '#'}" target="_blank" title="Zalo Official">Zalo</a>
      <a href="${data.socials.facebook || '#'}" target="_blank" title="Facebook">Facebook</a>
      <a href="${data.socials.linkedin || '#'}" target="_blank" title="LinkedIn">LinkedIn</a>
      ${data.socials.youtube ? `<a href="${data.socials.youtube}" target="_blank" title="YouTube">YouTube</a>` : ''}
    `;
  }

  // Partners Marquee
  const partnerTrack = document.getElementById('partnerTrack');
  partnerTrack.innerHTML = data.partners.map(p => `<span class="partner-item">${p}</span>`).join('');

  // Services Grid
  const servicesGrid = document.getElementById('servicesGrid');
  servicesGrid.innerHTML = data.services.map(s => `
    <div class="service-card">
      <div>
        <div class="service-icon-box">${getIconSvg(s.icon)}</div>
        <h3 class="service-title">${s.title}</h3>
        <p class="service-desc">${s.shortDesc}</p>
        <ul class="service-features-list">
          ${s.features.map(f => `<li>${f}</li>`).join('')}
        </ul>
      </div>
      <a href="#contact" class="service-link">
        ${ui.serviceCardCta || 'Nhận báo giá giải pháp'}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
    </div>
  `).join('');

  // Projects Grid
  const projectsGrid = document.getElementById('projectsGrid');
  projectsGrid.innerHTML = data.projects.map(p => `
    <div class="project-card">
      <div class="project-thumb">
        <img src="${p.image}" alt="${p.title}" loading="lazy">
        <span class="project-tag">${p.tag}</span>
      </div>
      <div class="project-body">
        <span class="project-cat">${p.category}</span>
        <h3 class="project-title">${p.title}</h3>
        <p class="project-client">${currentLang === 'en' ? 'Client' : 'Khách hàng'}: <strong>${p.client}</strong></p>
      </div>
    </div>
  `).join('');

  // FAQs Accordion
  const faqAccordion = document.getElementById('faqAccordion');
  faqAccordion.innerHTML = data.faqs.map((f, i) => `
    <div class="faq-item ${i === 0 ? 'active' : ''}">
      <button type="button" class="faq-question">
        <span>${f.question}</span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="faq-answer">${f.answer}</div>
    </div>
  `).join('');

  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isActive = item.classList.contains('active');
      document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('active'));
      if (!isActive) item.classList.add('active');
    });
  });

  // Testimonials
  const testimonialsGrid = document.getElementById('testimonialsGrid');
  testimonialsGrid.innerHTML = data.testimonials.map(t => `
    <div class="testimonial-card">
      <p class="t-comment">“${t.comment}”</p>
      <div class="t-user">
        <img src="${t.avatar}" alt="${t.name}">
        <div>
          <strong>${t.name}</strong>
          <span>${t.role}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el && text) el.textContent = text;
}

function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el && html) el.innerHTML = html;
}

// Contact Form Handler
document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('btnSubmit');
  const msgBox = document.getElementById('formMessage');

  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  btn.disabled = true;
  btn.textContent = currentLang === 'en' ? 'Submitting...' : 'Đang gửi thông tin...';
  msgBox.className = 'form-message';
  msgBox.textContent = '';

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (res.ok) {
      msgBox.className = 'form-message success';
      msgBox.innerHTML = currentLang === 'en'
        ? `✓ <strong>Success (Ticket #${data.code}):</strong> Thank you! Our experts will contact you within 15 minutes.`
        : `✓ <strong>Thành công (Mã yêu cầu: ${data.code}):</strong> ${data.message}`;
      form.reset();
    } else {
      msgBox.className = 'form-message error';
      msgBox.textContent = data.error || (currentLang === 'en' ? 'An error occurred, please try again.' : 'Có lỗi xảy ra, vui lòng thử lại.');
    }
  } catch (err) {
    msgBox.className = 'form-message error';
    msgBox.textContent = currentLang === 'en' ? 'Unable to connect to server.' : 'Không thể kết nối máy chủ. Vui lòng thử lại sau.';
  } finally {
    btn.disabled = false;
    btn.textContent = currentLang === 'en' ? 'Submit Consultation Request' : 'Gửi yêu cầu tư vấn';
  }
});

// Chọn gói Pricing và tự động cuộn xuống form liên hệ
function selectPricingPlan(planName) {
  const serviceSelect = document.getElementById('contactServiceSelect');
  if (serviceSelect) {
    let matched = false;
    for (let i = 0; i < serviceSelect.options.length; i++) {
      if (serviceSelect.options[i].text.toLowerCase().includes(planName.split(' ')[0].toLowerCase())) {
        serviceSelect.selectedIndex = i;
        matched = true;
        break;
      }
    }
    if (!matched) {
      const opt = new Option(planName, planName, true, true);
      serviceSelect.add(opt, 0);
    }
  }

  const msgArea = document.getElementById('contactMessageInput');
  if (msgArea && !msgArea.value) {
    msgArea.value = currentLang === 'en'
      ? `We would like to request detailed consultation & quote for the [${planName}] package.`
      : `Chúng tôi quan tâm và muốn nhận tư vấn chi tiết cho gói [${planName}].`;
  }

  const contactSection = document.getElementById('contact');
  if (contactSection) {
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 80;
    const top = contactSection.getBoundingClientRect().top + window.pageYOffset - headerHeight;
    window.scrollTo({ top, behavior: 'smooth' });
  }
}

// Xử lý cuộn mượt mà chuẩn xác cho toàn bộ các liên kết menu trên đầu trang
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href === '#') return;

  const targetEl = document.querySelector(href);
  if (targetEl) {
    e.preventDefault();
    const header = document.querySelector('.site-header');
    const headerHeight = header ? header.offsetHeight : 80;
    const top = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;
    window.scrollTo({ top, behavior: 'smooth' });

    // Cập nhật trạng thái active cho menu
    document.querySelectorAll('.main-nav .nav-link').forEach((a) => a.classList.remove('active'));
    if (link.classList.contains('nav-link')) {
      link.classList.add('active');
    }
  }
});

// Init on load
document.addEventListener('DOMContentLoaded', loadInitialData);
