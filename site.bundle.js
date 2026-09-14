gsap.registerPlugin(CustomEase, SplitText, ScrollTrigger, Observer);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;
let keenSliderInstance = null;
let imageTrailCleanup = null;
let modalEscBound = false;

const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("osmo", "0.625, 0.05, 0, 1");
gsap.defaults({ ease: "osmo", duration: durationDefault });

function initOnceFunctions() {
  initLenis();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  initHamburgerMenu();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;

  if (hasScrollTrigger) ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  if (window.Observer) Observer.getAll().forEach(observer => observer.kill());

  if (imageTrailCleanup) {
    imageTrailCleanup();
    imageTrailCleanup = null;
  }

  if (keenSliderInstance) {
    keenSliderInstance.destroy();
    keenSliderInstance = null;
  }
}

function initAfterEnterFunctions(data) {
  nextPage = data?.next?.container || document;

  reinitWebflow(data);

  if (has('[data-char-reveal]')) init_char_reveal();
  if (has('[data-word-reveal]')) init_word_reveal();
  if (has('[data-line-reveal]')) init_line_reveal();
  if (has('[data-highlight-text]')) initHighlightText();
  if (has('[data-draggable-marquee-init]')) initDraggableMarquee();
  if (has('[data-directional-hover]')) initDirectionalListHover();
  if (has('.keen-slider')) keenSliderInstance = initKeenSlider();
  if (has('[data-modal-target]')) initModalBasic();
  if (has('.faq_item')) initFaqAccordion();
  if (has('.curved_arrow, [data-svg-draw]')) initSvgDraw();
  if (has('[data-wipe-reveal]')) initWipes();
  if (has('[data-form-submit]')) initFormSubmit();
  if (has('[data-current-year]')) initDynamicCurrentYear();

  if (has('[data-trail="wrapper"]')) {
    imageTrailCleanup = initImageTrail({
      minWidth: 992,
      moveDistance: 15,
      stopDuration: 350,
      trailLength: 8
    });
  }

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}

function runPageOnceAnimation(next) {
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const transitionPanelTop = transitionWrap.querySelector("[data-transition-panel-top]");
  const transitionPanelBottom = transitionWrap.querySelector("[data-transition-panel-bottom]");
  const transitionLogo = transitionWrap.querySelector("[data-transition-logo]");
  const transitionLogoPath = transitionWrap.querySelectorAll("path");

  const tl = gsap.timeline({
    onComplete: () => { current.remove(); }
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  tl.set(transitionPanel, { autoAlpha: 1 }, 0);
  tl.set(transitionPanelTop, { scaleY: 0, height: "15vw" }, 0);
  tl.set(transitionPanelBottom, { scaleY: 1, height: "20vw" }, 0);
  tl.set(transitionLogo, { autoAlpha: 1 });
  tl.set(transitionLogoPath, { yPercent: 105 });
  tl.set(next, { autoAlpha: 0 }, 0);

  tl.fromTo(transitionPanel, { yPercent: 0 }, { yPercent: -100, duration: 1 }, 0);
  tl.fromTo(transitionPanelTop, { scaleY: 0 }, { scaleY: 1, duration: 1 }, "<");

  tl.fromTo(transitionLogoPath, { yPercent: 105 }, {
    yPercent: 0,
    duration: 0.8,
    ease: "expo.out",
    stagger: { amount: 0.06 }
  }, "<+=0.4");

  tl.fromTo(current, { y: "0vh" }, { y: "-15dvh", duration: 1 }, 0);

  return tl;
}

function runPageEnterAnimation(next) {
  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const transitionPanelBottom = transitionWrap.querySelector("[data-transition-panel-bottom]");
  const transitionLogoPath = transitionWrap.querySelectorAll("path");

  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  tl.add("startEnter", 1.35);

  tl.set(next, { autoAlpha: 1 }, "startEnter");

  tl.fromTo(transitionPanel, { yPercent: -100 }, {
    yPercent: -200,
    duration: 1,
    overwrite: "auto",
    immediateRender: false
  }, "startEnter");

  tl.fromTo(transitionPanelBottom, { scaleY: 1 }, { scaleY: 0, duration: 1 }, "<");

  tl.set(transitionPanel, { autoAlpha: 0 }, ">");

  tl.to(transitionLogoPath, {
    yPercent: -130,
    duration: 1.2,
    ease: "expo.inOut",
    stagger: { amount: -0.06 }
  }, "startEnter-=0.4");

  tl.from(next, { y: "25dvh", duration: 1 }, "startEnter");

  tl.add("pageReady");
  tl.call(resetPage, [next], "pageReady");

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}

function cleanupTurnstile(container) {
  if (!window.turnstile || typeof window.turnstile.remove !== 'function') return;
  if (!container || !container.querySelectorAll) return;

  container.querySelectorAll('[data-turnstile-sitekey]').forEach((form) => {
    try {
      window.turnstile.remove(form);
    } catch (err) {
      console.error('turnstile remove failed', err);
    }
  });
}

barba.hooks.beforeLeave(data => {
  cleanupTurnstile(data.current.container);
  closeHamburgerMenu();
});

barba.hooks.beforeEnter(data => {
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });

  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }

  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
  primeWipes(data.next.container);
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter(data => {
  initAfterEnterFunctions(data);

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

function normalizePath(path) {
  const clean = path.replace(/\/+$/, "");
  return clean || "/";
}

function shouldPreventBarbaNavigation(data = {}) {
  const el = data.el;
  const href = data.href || el?.getAttribute?.("href") || el?.href;
  if (!href) return false;

  try {
    const url = new URL(href, window.location.origin);
    return normalizePath(url.pathname) === "/";
  } catch {
    return false;
  }
}

barba.init({
  debug: true,
  timeout: 7000,
  preventRunning: true,
  prevent: shouldPreventBarbaNavigation,
  transitions: [
    {
      name: "default",
      sync: true,

      async once(data) {
        initOnceFunctions();
        return runPageOnceAnimation(data.next.container);
      },

      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});

const themeConfig = {
  light: { nav: "dark", transition: "light" },
  dark: { nav: "light", transition: "dark" }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, { clearProps: "position,top,left,right" });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}

function debounceOnWidthChange(fn, ms) {
  let last = innerWidth, timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (innerWidth !== last) {
        last = innerWidth;
        fn.apply(this, args);
      }
    }, ms);
  };
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;

    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    var newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}

function reinitWebflow(data) {
  if (!window.Webflow) return;

  try {
    if (data?.next?.html) {
      const parser = new DOMParser();
      const dom = parser.parseFromString(data.next.html, 'text/html');
      const wfPage = dom.documentElement.getAttribute('data-wf-page');
      if (wfPage) {
        document.documentElement.setAttribute('data-wf-page', wfPage);
      }
    }
  } catch (err) {
    console.error('data-wf-page sync failed', err);
  }

  try {
    window.Webflow.destroy();
  } catch (err) {
    console.error('Webflow.destroy failed', err);
  }

  try {
    window.Webflow.ready();
  } catch (err) {
    console.error('Webflow.ready failed', err);
  }

  try {
    if (window.Webflow.require) {
      const ix2 = window.Webflow.require('ix2');
      if (ix2 && ix2.init) ix2.init();
    }
  } catch (err) {
    console.error('Webflow ix2 reinit failed', err);
  }

  try {
    if (window.Webflow.require) {
      const forms = window.Webflow.require('forms');
      if (forms && forms.init) forms.init();
    }
  } catch (err) {
    console.error('Webflow forms reinit failed', err);
  }

  try {
    document.dispatchEvent(new Event('readystatechange'));
  } catch (err) {
    console.error('readystatechange dispatch failed', err);
  }
}

function initHamburgerMenu() {
  const toggle = document.getElementById('hamburgerToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.addEventListener('click', () => {
    toggle.classList.toggle('is--open');
    menu.classList.toggle('is--open');
  });
}

function closeHamburgerMenu() {
  const toggle = document.getElementById('hamburgerToggle');
  const menu = document.getElementById('mobileMenu');
  if (!toggle || !menu) return;

  toggle.classList.remove('is--open');
  menu.classList.remove('is--open');
}

function initDynamicCurrentYear() {
  const currentYear = new Date().getFullYear();
  document.querySelectorAll('[data-current-year]').forEach(el => {
    el.textContent = currentYear;
  });
}

function initKeenSlider() {
  const sliderEl = document.querySelector('.keen-slider');
  if (!sliderEl) return null;

  return new KeenSlider(".keen-slider", {
    loop: false,
    slides: { perView: 3.2, spacing: 24, origin: "auto" },
    breakpoints: {
      "(max-width: 991px)": { slides: { perView: 1.8, spacing: 16, origin: "auto" } },
      "(max-width: 767px)": { slides: { perView: 1.4, spacing: 16, origin: "auto" } },
      "(max-width: 479px)": { slides: { perView: 1.1, spacing: 8, origin: "auto" } },
    },
  });
}

function initModalBasic() {
  document.querySelectorAll('[data-modal-target]').forEach((modalTarget) => {
    modalTarget.addEventListener('click', function () {
      const modalTargetName = this.getAttribute('data-modal-target');

      document.querySelectorAll('[data-modal-target]').forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
      document.querySelectorAll('[data-modal-name]').forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));

      document.querySelectorAll(`[data-modal-target="${modalTargetName}"]`).forEach((el) => el.setAttribute('data-modal-status', 'active'));
      document.querySelector(`[data-modal-name="${modalTargetName}"]`)?.setAttribute('data-modal-status', 'active');

      const modalGroup = document.querySelector('[data-modal-group-status]');
      if (modalGroup) {
        modalGroup.setAttribute('data-modal-group-status', 'active');
      }

      if (hasLenis && lenis) {
        lenis.stop();
      }
    });
  });

  document.querySelectorAll('[data-modal-close]').forEach((closeBtn) => {
    closeBtn.addEventListener('click', closeAllModals);
  });

  if (!modalEscBound) {
    modalEscBound = true;
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeAllModals();
      }
    });
  }
}

function closeAllModals() {
  document.querySelectorAll('[data-modal-target]').forEach((target) => target.setAttribute('data-modal-status', 'not-active'));
  document.querySelectorAll('[data-modal-name]').forEach((modal) => modal.setAttribute('data-modal-status', 'not-active'));

  const modalGroup = document.querySelector('[data-modal-group-status]');
  if (modalGroup) {
    modalGroup.setAttribute('data-modal-group-status', 'not-active');
  }

  if (hasLenis && lenis) {
    lenis.start();
  }
}

function initFaqAccordion() {
  document.querySelectorAll('.faq_item').forEach((item) => {
    const trigger = item.querySelector('.faq_question');
    const answer = item.querySelector('.faq_answer');
    if (!trigger || !answer) return;

    trigger.addEventListener('click', () => {
      const isOpen = item.classList.contains('is-open');

      document.querySelectorAll('.faq_item.is-open').forEach((openItem) => {
        if (openItem !== item) {
          openItem.classList.remove('is-open');
          openItem.querySelector('.faq_answer').style.height = '0px';
        }
      });

      if (isOpen) {
        item.classList.remove('is-open');
        answer.style.height = '0px';
      } else {
        item.classList.add('is-open');
        answer.style.height = answer.scrollHeight + 'px';
      }
    });
  });
}

function wipeVars(direction) {
  switch ((direction || 'left').toLowerCase()) {
    case 'right':
      return { from: { xPercent: 0 }, to: { xPercent: 100 } };
    case 'top':
      return { from: { yPercent: 0 }, to: { yPercent: -100 } };
    case 'bottom':
      return { from: { yPercent: 0 }, to: { yPercent: 100 } };
    default:
      return { from: { xPercent: 0 }, to: { xPercent: -100 } };
  }
}

function primeWipes(scope) {
  const elements = (scope || document).querySelectorAll('[data-wipe-reveal]');

  elements.forEach((el) => {
    const style = getComputedStyle(el);
    if (style.position === 'static') el.style.position = 'relative';
    if (style.overflow === 'visible') el.style.overflow = 'hidden';

    let overlay = el.querySelector(':scope > .wipe_overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'wipe_overlay';
      overlay.style.position = 'absolute';
      overlay.style.inset = '0';
      overlay.style.zIndex = '2';
      overlay.style.pointerEvents = 'none';
      el.appendChild(overlay);
    }

    overlay.style.background = style.getPropertyValue('--wipe-color').trim() || '#131415';

    const { from } = wipeVars(el.getAttribute('data-wipe-reveal'));
    gsap.set(overlay, from);
    el._wipePlayed = false;
    el.style.opacity = '1';
  });
}

function initWipes() {
  const elements = document.querySelectorAll('[data-wipe-reveal]');

  elements.forEach((el) => {
    const overlay = el.querySelector(':scope > .wipe_overlay');
    if (!overlay) return;

    const { to } = wipeVars(el.getAttribute('data-wipe-reveal'));

    ScrollTrigger.create({
      trigger: el,
      start: 'top 80%',
      once: true,
      onEnter: () => {
        if (el._wipePlayed) return;
        el._wipePlayed = true;
        gsap.to(overlay, { ...to, duration: 1.1, ease: 'power2.out', overwrite: 'auto' });
      }
    });
  });
}

function initSvgDraw() {
  const svgs = document.querySelectorAll('.curved_arrow, [data-svg-draw]');

  svgs.forEach((svg) => {
    const paths = svg.querySelectorAll('path');
    if (!paths.length) return;

    const scrollStart = svg.getAttribute('data-svg-draw-start') || 'top 80%';
    const duration = parseFloat(svg.getAttribute('data-svg-draw-duration')) || 1.5;
    const ease = svg.getAttribute('data-svg-draw-ease') || 'power2.inOut';
    const stagger = parseFloat(svg.getAttribute('data-svg-draw-stagger')) || 0.1;

    paths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = length;
      path.style.strokeDashoffset = length;
    });

    svg.style.opacity = '1';

    gsap.to(paths, {
      strokeDashoffset: 0,
      duration: duration,
      ease: ease,
      stagger: stagger,
      scrollTrigger: {
        trigger: svg,
        start: scrollStart,
        once: true,
      }
    });
  });
}

function initFormSubmit() {
  document.querySelectorAll('form[data-wf-page-id]').forEach((form) => {
    form.setAttribute('method', 'post');
  });

  document.querySelectorAll('[data-form-submit]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const form = btn.closest('form');
      const realSubmit = form?.querySelector('input[type="submit"], button[type="submit"]');
      if (realSubmit) realSubmit.click();
    });
  });
}

function init_char_reveal() {
  const elements = document.querySelectorAll("[data-char-reveal]");

  elements.forEach((el) => {
    const stagger = parseFloat(el.dataset.charRevealStagger) || 0.03;
    const duration = parseFloat(el.dataset.charRevealDuration) || 0.8;
    const delay = parseFloat(el.dataset.charRevealDelay) || 0;
    const ease = el.dataset.charRevealEase || "power3.out";
    const y_offset = parseFloat(el.dataset.charRevealY) || 40;
    const use_scroll = el.dataset.charRevealScroll === "true";
    const scroll_start = el.dataset.charRevealScrollStart || "top 80%";

    const split = new SplitText(el, {
      type: "chars,words",
      charsClass: "char_reveal_char",
      wordsClass: "char_reveal_word",
    });

    gsap.set(split.chars, { opacity: 0, y: y_offset });

    const anim_vars = {
      opacity: 1,
      y: 0,
      duration: duration,
      delay: delay,
      ease: ease,
      stagger: stagger,
    };

    if (use_scroll) {
      anim_vars.scrollTrigger = {
        trigger: el,
        start: scroll_start,
        toggleActions: "play none none none",
        once: true,
      };
    }

    gsap.to(split.chars, anim_vars);
    el._char_reveal_split = split;
    el.style.visibility = "visible";
  });
}

function init_word_reveal() {
  const elements = document.querySelectorAll("[data-word-reveal]");

  elements.forEach((el) => {
    const stagger = parseFloat(el.dataset.wordRevealStagger) || 0.06;
    const duration = parseFloat(el.dataset.wordRevealDuration) || 0.8;
    const delay = parseFloat(el.dataset.wordRevealDelay) || 0;
    const ease = el.dataset.wordRevealEase || "power3.out";
    const y_offset = parseFloat(el.dataset.wordRevealY) || 30;
    const use_scroll = el.dataset.wordRevealScroll === "true";
    const scroll_start = el.dataset.wordRevealScrollStart || "top 80%";

    const split = new SplitText(el, {
      type: "words",
      wordsClass: "word_reveal_word",
    });

    gsap.set(split.words, { opacity: 0, y: y_offset });

    const anim_vars = {
      opacity: 1,
      y: 0,
      duration: duration,
      delay: delay,
      ease: ease,
      stagger: stagger,
    };

    if (use_scroll) {
      anim_vars.scrollTrigger = {
        trigger: el,
        start: scroll_start,
        toggleActions: "play none none none",
        once: true,
      };
    }

    gsap.to(split.words, anim_vars);
    el._word_reveal_split = split;
    el.style.visibility = "visible";
  });
}

function init_line_reveal() {
  const elements = document.querySelectorAll("[data-line-reveal]");

  elements.forEach((el) => {
    const stagger = parseFloat(el.dataset.lineRevealStagger) || 0.1;
    const duration = parseFloat(el.dataset.lineRevealDuration) || 0.9;
    const delay = parseFloat(el.dataset.lineRevealDelay) || 0;
    const ease = el.dataset.lineRevealEase || "power3.out";
    const y_offset = parseFloat(el.dataset.lineRevealY) || 100;
    const use_scroll = el.dataset.lineRevealScroll === "true";
    const scroll_start = el.dataset.lineRevealScrollStart || "top 80%";

    const split = new SplitText(el, {
      type: "lines",
      mask: "lines",
      linesClass: "line_reveal_line",
      maskClass: "line_reveal_mask",
    });

    gsap.set(split.lines, { y: y_offset });

    const anim_vars = {
      y: 0,
      duration: duration,
      delay: delay,
      ease: ease,
      stagger: stagger,
    };

    if (use_scroll) {
      anim_vars.scrollTrigger = {
        trigger: el,
        start: scroll_start,
        toggleActions: "play none none none",
        once: true,
      };
    }

    gsap.to(split.lines, anim_vars);
    el._line_reveal_split = split;
    el.style.visibility = "visible";
  });

  if (!window._line_reveal_resize_bound) {
    window._line_reveal_resize_bound = true;
    let line_reveal_resize_timeout;
    window.addEventListener("resize", () => {
      clearTimeout(line_reveal_resize_timeout);
      line_reveal_resize_timeout = setTimeout(() => {
        document.querySelectorAll("[data-line-reveal]").forEach((el) => {
          if (el._line_reveal_split) el._line_reveal_split.revert();
        });
        init_line_reveal();
      }, 200);
    });
  }
}

function initHighlightText() {
  const splitHeadingTargets = document.querySelectorAll("[data-highlight-text]");

  splitHeadingTargets.forEach((heading) => {
    const scrollStart = heading.getAttribute("data-highlight-scroll-start") || "top 90%";
    const scrollEnd = heading.getAttribute("data-highlight-scroll-end") || "center 40%";
    const fadedValue = heading.getAttribute("data-highlight-fade") || 0.2;
    const staggerValue = heading.getAttribute("data-highlight-stagger") || 0.1;

    new SplitText(heading, {
      type: "words, chars",
      autoSplit: true,
      onSplit(self) {
        let ctx = gsap.context(() => {
          let tl = gsap.timeline({
            scrollTrigger: {
              scrub: true,
              trigger: heading,
              start: scrollStart,
              end: scrollEnd,
            }
          });
          tl.from(self.chars, {
            autoAlpha: fadedValue,
            stagger: staggerValue,
            ease: "linear"
          });
        });
        return ctx;
      }
    });
  });
}

function initDraggableMarquee() {
  const wrappers = document.querySelectorAll("[data-draggable-marquee-init]");

  const getNumberAttr = (el, name, fallback) => {
    const value = parseFloat(el.getAttribute(name));
    return Number.isFinite(value) ? value : fallback;
  };

  wrappers.forEach((wrapper) => {
    if (wrapper.getAttribute("data-draggable-marquee-init") === "initialized") return;

    const collection = wrapper.querySelector("[data-draggable-marquee-collection]");
    const list = wrapper.querySelector("[data-draggable-marquee-list]");
    if (!collection || !list) return;

    const duration = getNumberAttr(wrapper, "data-duration", 20);
    const multiplier = getNumberAttr(wrapper, "data-multiplier", 40);
    const sensitivity = getNumberAttr(wrapper, "data-sensitivity", 0.01);

    const wrapperWidth = wrapper.getBoundingClientRect().width;
    const listWidth = list.scrollWidth || list.getBoundingClientRect().width;
    if (!wrapperWidth || !listWidth) return;

    const minRequiredWidth = wrapperWidth + listWidth + 2;
    while (collection.scrollWidth < minRequiredWidth) {
      const listClone = list.cloneNode(true);
      listClone.setAttribute("data-draggable-marquee-clone", "");
      listClone.setAttribute("aria-hidden", "true");
      collection.appendChild(listClone);
    }

    const wrapX = gsap.utils.wrap(-listWidth, 0);

    gsap.set(collection, { x: 0 });

    const marqueeLoop = gsap.to(collection, {
      x: -listWidth,
      duration,
      ease: "none",
      repeat: -1,
      onReverseComplete: () => marqueeLoop.progress(1),
      modifiers: {
        x: (x) => wrapX(parseFloat(x)) + "px"
      },
    });

    const initialDirectionAttr = (wrapper.getAttribute("data-direction") || "left").toLowerCase();
    const baseDirection = initialDirectionAttr === "right" ? -1 : 1;

    const timeScale = { value: 1 };
    timeScale.value = baseDirection;
    wrapper.setAttribute("data-direction", baseDirection < 0 ? "right" : "left");

    if (baseDirection < 0) marqueeLoop.progress(1);

    function applyTimeScale() {
      marqueeLoop.timeScale(timeScale.value);
      wrapper.setAttribute("data-direction", timeScale.value < 0 ? "right" : "left");
    }

    applyTimeScale();

    const marqueeObserver = Observer.create({
      target: wrapper,
      type: "pointer,touch",
      preventDefault: true,
      debounce: false,
      onChangeX: (observerEvent) => {
        let velocityTimeScale = observerEvent.velocityX * -sensitivity;
        velocityTimeScale = gsap.utils.clamp(-multiplier, multiplier, velocityTimeScale);

        gsap.killTweensOf(timeScale);

        const restingDirection = velocityTimeScale < 0 ? -1 : 1;

        gsap.timeline({ onUpdate: applyTimeScale })
          .to(timeScale, { value: velocityTimeScale, duration: 0.1, overwrite: true })
          .to(timeScale, { value: restingDirection, duration: 1.0 });
      }
    });

    ScrollTrigger.create({
      trigger: wrapper,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => { marqueeLoop.resume(); applyTimeScale(); marqueeObserver.enable(); },
      onEnterBack: () => { marqueeLoop.resume(); applyTimeScale(); marqueeObserver.enable(); },
      onLeave: () => { marqueeLoop.pause(); marqueeObserver.disable(); },
      onLeaveBack: () => { marqueeLoop.pause(); marqueeObserver.disable(); }
    });

    wrapper.setAttribute("data-draggable-marquee-init", "initialized");
  });
}

let directionalHoverRegistry = [];
let directionalHoverScrollBound = false;

function initDirectionalListHover() {
  const directionMap = {
    top: 'translateY(-100%)',
    bottom: 'translateY(100%)',
    left: 'translateX(-100%)',
    right: 'translateX(100%)'
  };

  directionalHoverRegistry = [];

  document.querySelectorAll('[data-directional-hover]').forEach(container => {
    const type = container.getAttribute('data-type') || 'all';
    const breakpoint = parseInt(container.getAttribute('data-directional-hover-breakpoint')) || 991;
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const items = Array.from(container.querySelectorAll('[data-directional-hover-item]'));

    const state = { type, mq, items, activeItem: null, lastScrollY: window.scrollY };

    function getDirection(event, el) {
      const { left, top, width: w, height: h } = el.getBoundingClientRect();
      const x = event.clientX - left;
      const y = event.clientY - top;
      if (type === 'y') return y < h / 2 ? 'top' : 'bottom';
      if (type === 'x') return x < w / 2 ? 'left' : 'right';
      const distances = { top: y, right: w - x, bottom: h - y, left: x };
      return Object.entries(distances).reduce((a, b) => (a[1] < b[1] ? a : b))[0];
    }

    function setTile(tile, dir, status, item) {
      tile.style.transition = 'none';
      tile.style.transform = directionMap[dir] || 'translate(0, 0)';
      void tile.offsetHeight;
      tile.style.transition = '';
      tile.style.transform = 'translate(0%, 0%)';
      item.setAttribute('data-status', `${status}-${dir}`);
    }

    items.forEach(item => {
      const tile = item.querySelector('[data-directional-hover-tile]');
      if (!tile) return;

      item.addEventListener('mouseenter', e => {
        if (mq.matches) return;
        const dir = getDirection(e, item);
        setTile(tile, dir, 'enter', item);
      });

      item.addEventListener('mouseleave', e => {
        if (mq.matches) return;
        const dir = getDirection(e, item);
        item.setAttribute('data-status', `leave-${dir}`);
        tile.style.transform = directionMap[dir] || 'translate(0, 0)';
      });
    });

    mq.addEventListener('change', () => {
      if (mq.matches) {
        updateCenterActivation(state, directionMap);
        return;
      }
      if (!state.activeItem) return;
      const tile = state.activeItem.querySelector('[data-directional-hover-tile]');
      if (tile) tile.style.transform = 'translate(0%, 0%)';
      state.activeItem.removeAttribute('data-status');
      state.activeItem = null;
    });

    directionalHoverRegistry.push({ state, directionMap });

    if (mq.matches) updateCenterActivation(state, directionMap);
  });

  if (!directionalHoverScrollBound) {
    directionalHoverScrollBound = true;
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      window.requestAnimationFrame(() => {
        directionalHoverRegistry.forEach(({ state, directionMap }) => {
          updateCenterActivation(state, directionMap);
        });
        ticking = false;
      });
      ticking = true;
    });
  }
}

function updateCenterActivation(state, directionMap) {
  if (!state.mq.matches) return;

  const scrollingDown = window.scrollY > state.lastScrollY;
  state.lastScrollY = window.scrollY;
  const viewportCenter = window.innerHeight / 2;

  let closestItem = null;
  let closestDistance = Infinity;

  state.items.forEach(item => {
    const rect = item.getBoundingClientRect();
    const itemCenter = rect.top + rect.height / 2;
    const distance = Math.abs(itemCenter - viewportCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestItem = item;
    }
  });

  if (closestItem && closestItem !== state.activeItem) {
    const enterDir = state.type === 'x' ? (scrollingDown ? 'right' : 'left') : (scrollingDown ? 'bottom' : 'top');
    const leaveDir = state.type === 'x' ? (scrollingDown ? 'left' : 'right') : (scrollingDown ? 'top' : 'bottom');

    if (state.activeItem) {
      const prevTile = state.activeItem.querySelector('[data-directional-hover-tile]');
      if (prevTile) {
        state.activeItem.setAttribute('data-status', `leave-${leaveDir}`);
        prevTile.style.transform = directionMap[leaveDir] || 'translate(0, 0)';
      }
    }

    const nextTile = closestItem.querySelector('[data-directional-hover-tile]');
    if (nextTile) {
      nextTile.style.transition = 'none';
      nextTile.style.transform = directionMap[enterDir] || 'translate(0, 0)';
      void nextTile.offsetHeight;
      nextTile.style.transition = '';
      nextTile.style.transform = 'translate(0%, 0%)';
      closestItem.setAttribute('data-status', `enter-${enterDir}`);
    }

    state.activeItem = closestItem;
  }
}

function initImageTrail(config = {}) {
  const options = {
    minWidth: config.minWidth ?? 992,
    moveDistance: config.moveDistance ?? 15,
    stopDuration: config.stopDuration ?? 300,
    trailLength: config.trailLength ?? 5
  };

  const wrapper = document.querySelector('[data-trail="wrapper"]');
  if (!wrapper || window.innerWidth < options.minWidth) return null;

  const state = {
    trailInterval: null,
    globalIndex: 0,
    last: { x: 0, y: 0 },
    trailImageTimestamps: new Map(),
    trailImages: Array.from(document.querySelectorAll('[data-trail="item"]')),
    isActive: false
  };

  const MathUtils = {
    lerp: (a, b, n) => (1 - n) * a + n * b,
    distance: (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
  };

  function getRelativeCoordinates(e, rect) {
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function activate(trailImage, x, y) {
    if (!trailImage) return;
    const rect = trailImage.getBoundingClientRect();

    Object.assign(trailImage.style, {
      left: `${x - rect.width / 2}px`,
      top: `${y - rect.height / 2}px`,
      zIndex: state.globalIndex,
      display: 'block'
    });

    state.trailImageTimestamps.set(trailImage, Date.now());

    gsap.fromTo(trailImage, { autoAlpha: 0, scale: 0.8 }, {
      scale: 1,
      autoAlpha: 1,
      duration: 0.2,
      overwrite: true
    });

    state.last = { x, y };
  }

  function fadeOutTrailImage(trailImage) {
    if (!trailImage) return;
    gsap.to(trailImage, {
      opacity: 0,
      scale: 0.2,
      duration: 0.8,
      ease: "expo.out",
      onComplete: () => gsap.set(trailImage, { autoAlpha: 0 })
    });
  }

  function handleOnMove(e) {
    if (!state.isActive || state.trailImages.length === 0) return;

    const rectWrapper = wrapper.getBoundingClientRect();
    const { x: relativeX, y: relativeY } = getRelativeCoordinates(e, rectWrapper);

    const distanceFromLast = MathUtils.distance(relativeX, relativeY, state.last.x, state.last.y);

    if (distanceFromLast > window.innerWidth / options.moveDistance) {
      const lead = state.trailImages[state.globalIndex % state.trailImages.length];
      const tail = state.trailImages[(state.globalIndex - options.trailLength) % state.trailImages.length];

      activate(lead, relativeX, relativeY);
      fadeOutTrailImage(tail);
      state.globalIndex++;
    }
  }

  function cleanupTrailImages() {
    const currentTime = Date.now();
    for (const [trailImage, timestamp] of state.trailImageTimestamps.entries()) {
      if (currentTime - timestamp > options.stopDuration) {
        fadeOutTrailImage(trailImage);
        state.trailImageTimestamps.delete(trailImage);
      }
    }
  }

  function startTrail() {
    if (state.isActive) return;
    state.isActive = true;
    wrapper.addEventListener("mousemove", handleOnMove);
    state.trailInterval = setInterval(cleanupTrailImages, 100);
  }

  function stopTrail() {
    if (!state.isActive) return;
    state.isActive = false;
    wrapper.removeEventListener("mousemove", handleOnMove);
    clearInterval(state.trailInterval);
    state.trailInterval = null;
    state.trailImages.forEach(fadeOutTrailImage);
    state.trailImageTimestamps.clear();
  }

  ScrollTrigger.create({
    trigger: wrapper,
    start: "top bottom",
    end: "bottom top",
    onEnter: () => { startTrail(); },
    onEnterBack: () => { startTrail(); },
    onLeave: () => { stopTrail(); },
    onLeaveBack: () => { stopTrail(); }
  });

  const handleResize = () => {
    if (window.innerWidth < options.minWidth && state.isActive) {
      stopTrail();
    } else if (window.innerWidth >= options.minWidth && !state.isActive) {
      startTrail();
    }
  };

  window.addEventListener('resize', handleResize);

  return () => {
    stopTrail();
    window.removeEventListener('resize', handleResize);
  };
}
