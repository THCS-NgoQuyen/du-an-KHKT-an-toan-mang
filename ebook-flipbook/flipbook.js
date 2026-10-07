/**
 * E-BOOK 3D FLIPBOOK ENGINE - CẨM NANG CÔNG DÂN SỐ
 * Supports 45 pages (Front Cover + 43 Content Pages + Back Cover), 2:3 portrait aspect ratio
 * 2-page spread and 1-page mode, zoom/pan, Web Audio realistic paper sounds
 */

(() => {
  'use strict';

  const TOTAL_PAGES = 45;
  const IMAGES_DIR = 'images/';

  // State
  let viewMode = window.innerWidth <= 850 ? 'single' : 'spread'; // 'spread' | 'single'
  let currentPage = 1; // 1 to 45
  let isFlipping = false;
  let soundEnabled = true;
  let autoPlayTimer = null;
  const AUTO_PLAY_INTERVAL = 4500; // 4.5s

  // Zoom & Pan state
  let zoomScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startPanX = 0;
  let startPanY = 0;

  // DOM Elements
  const viewport = document.getElementById('viewport');
  const bookContainer = document.getElementById('bookTransformContainer');
  const book = document.getElementById('book');
  const leftBase = document.getElementById('leftBase');
  const rightBase = document.getElementById('rightBase');
  const leftBaseImg = document.getElementById('leftBaseImg');
  const rightBaseImg = document.getElementById('rightBaseImg');
  const leftBaseNum = document.getElementById('leftBaseNum');
  const rightBaseNum = document.getElementById('rightBaseNum');
  const sheetsContainer = document.getElementById('sheetsContainer');

  const pageIndicator = document.getElementById('pageIndicator');
  const pageSlider = document.getElementById('pageSlider');
  const pageNumberInput = document.getElementById('pageNumberInput');
  const btnGoToPage = document.getElementById('btnGoToPage');

  const btnPrev = document.getElementById('btnPrev');
  const btnNext = document.getElementById('btnNext');
  const btnFirst = document.getElementById('btnFirst');
  const btnLast = document.getElementById('btnLast');
  const btnPrevPageSide = document.getElementById('btnPrevPageSide');
  const btnNextPageSide = document.getElementById('btnNextPageSide');

  const btnModeSpread = document.getElementById('btnModeSpread');
  const btnModeSingle = document.getElementById('btnModeSingle');
  const btnSound = document.getElementById('btnSound');
  const btnAutoPlay = document.getElementById('btnAutoPlay');
  const btnFullscreen = document.getElementById('btnFullscreen');
  const btnGrid = document.getElementById('btnGrid');
  const btnCloseGrid = document.getElementById('btnCloseGrid');
  const gridModal = document.getElementById('gridModal');
  const modalGridItems = document.getElementById('modalGridItems');

  const btnZoomIn = document.getElementById('btnZoomIn');
  const btnZoomOut = document.getElementById('btnZoomOut');
  const btnZoomReset = document.getElementById('btnZoomReset');
  const zoomLevelText = document.getElementById('zoomLevel');

  const btnToggleDrawer = document.getElementById('btnToggleDrawer');
  const thumbDrawer = document.getElementById('thumbDrawer');
  const thumbList = document.getElementById('thumbList');

  // Web Audio Context for realistic paper rustle
  let audioCtx = null;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function playPaperSound() {
    if (!soundEnabled) return;
    try {
      initAudio();
      if (!audioCtx) return;

      const duration = 0.32;
      const bufferSize = audioCtx.sampleRate * duration;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate brown/pink shaped noise
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.025 * white)) / 1.025;
        lastOut = data[i];
      }

      const noiseNode = audioCtx.createBufferSource();
      noiseNode.buffer = buffer;

      // Filter: sweeping bandpass to imitate paper friction & whoosh
      const filter = audioCtx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, audioCtx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(350, audioCtx.currentTime + duration);
      filter.Q.setValueAtTime(1.5, audioCtx.currentTime);

      // Gain envelope
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.01, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.35, audioCtx.currentTime + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      noiseNode.start();
      noiseNode.stop(audioCtx.currentTime + duration);
    } catch (e) {
      // Audio fallback silent
    }
  }

  // Preload images into memory
  const preloadedImages = new Map();
  function preloadAllImages() {
    for (let i = 1; i <= TOTAL_PAGES; i++) {
      const img = new Image();
      img.src = `${IMAGES_DIR}${i}.png`;
      preloadedImages.set(i, img);
    }
  }

  // Responsive Book Sizing
  function resizeBook() {
    const vpWidth = viewport.clientWidth;
    const vpHeight = viewport.clientHeight;
    const paddingX = 40;
    const paddingY = 30;

    const availW = Math.max(280, vpWidth - paddingX);
    const availH = Math.max(300, vpHeight - paddingY);

    if (viewMode === 'spread') {
      // Spread: 2 pages side by side. Each page is 2:3, so 2 pages = 4:3
      const targetRatio = 4 / 3;
      let w = availW;
      let h = w / targetRatio;
      if (h > availH) {
        h = availH;
        w = h * targetRatio;
      }
      book.style.width = `${Math.floor(w)}px`;
      book.style.height = `${Math.floor(h)}px`;
      book.classList.remove('single-page-mode');
    } else {
      // Single page: 2:3 aspect ratio
      const targetRatio = 2 / 3;
      let h = availH;
      let w = h * targetRatio;
      if (w > availW) {
        w = availW;
        h = w / targetRatio;
      }
      book.style.width = `${Math.floor(w)}px`;
      book.style.height = `${Math.floor(h)}px`;
      book.classList.add('single-page-mode');
    }

    applyTransform();
  }

  // Apply Zoom & Pan Transform
  function applyTransform() {
    bookContainer.style.transform = `scale(${zoomScale}) translate(${panX}px, ${panY}px)`;
    zoomLevelText.textContent = `${Math.round(zoomScale * 100)}%`;
    if (zoomScale > 1.05) {
      viewport.classList.add('zoomed');
    } else {
      viewport.classList.remove('zoomed');
      panX = 0;
      panY = 0;
    }
  }

  // Calculate current spread pages (leftPage, rightPage)
  // Page 1 is Cover (spread 0: null, 1)
  // Spread 1: (2, 3)
  // Spread 2: (4, 5)
  // ...
  // Spread 18: (36, 37)
  // Spread 19: (38, null) - Back Cover
  function getSpreadForPage(page) {
    if (page <= 1) {
      return { left: null, right: 1, spreadIndex: 0 };
    }
    if (page >= TOTAL_PAGES) {
      return { left: TOTAL_PAGES - 1, right: TOTAL_PAGES, spreadIndex: Math.floor(TOTAL_PAGES / 2) };
    }
    if (page % 2 === 0) {
      return { left: page, right: Math.min(page + 1, TOTAL_PAGES), spreadIndex: page / 2 };
    } else {
      return { left: page - 1, right: page, spreadIndex: (page - 1) / 2 };
    }
  }

  // Render bases statically (without animation)
  function renderStatic() {
    if (viewMode === 'spread') {
      const { left, right } = getSpreadForPage(currentPage);

      if (left) {
        leftBase.style.visibility = 'visible';
        leftBaseImg.src = `${IMAGES_DIR}${left}.png`;
        leftBaseNum.textContent = `Trang ${left}`;
        leftBaseNum.style.display = 'block';
      } else {
        leftBase.style.visibility = 'hidden';
        leftBaseNum.style.display = 'none';
      }

      if (right) {
        rightBase.style.visibility = 'visible';
        rightBaseImg.src = `${IMAGES_DIR}${right}.png`;
        rightBaseNum.textContent = `Trang ${right}`;
        rightBaseNum.style.display = 'block';
      } else {
        rightBase.style.visibility = 'hidden';
        rightBaseNum.style.display = 'none';
      }

      // Update indicator text
      if (left && right) {
        if (right === TOTAL_PAGES) {
          pageIndicator.textContent = `Trang ${left} - ${right} (Bìa sau) / ${TOTAL_PAGES}`;
        } else {
          pageIndicator.textContent = `Trang ${left} - ${right} / ${TOTAL_PAGES}`;
        }
      } else if (right) {
        pageIndicator.textContent = `Trang 1 (Bìa trước) / ${TOTAL_PAGES}`;
      } else if (left) {
        pageIndicator.textContent = `Trang ${TOTAL_PAGES} (Bìa sau) / ${TOTAL_PAGES}`;
      }
    } else {
      // Single page mode
      leftBase.style.visibility = 'hidden';
      rightBase.style.visibility = 'visible';
      rightBaseImg.src = `${IMAGES_DIR}${currentPage}.png`;
      rightBaseNum.textContent = `Trang ${currentPage}`;
      rightBaseNum.style.display = 'block';
      if (currentPage === 1) {
        pageIndicator.textContent = `Trang 1 (Bìa trước) / ${TOTAL_PAGES}`;
      } else if (currentPage === TOTAL_PAGES) {
        pageIndicator.textContent = `Trang ${TOTAL_PAGES} (Bìa sau) / ${TOTAL_PAGES}`;
      } else {
        pageIndicator.textContent = `Trang ${currentPage} / ${TOTAL_PAGES}`;
      }
    }

    // Update Slider & Number Input
    pageSlider.value = currentPage;
    pageNumberInput.value = currentPage;

    // Update prev/next button disabled states
    updateNavigationButtons();

    // Highlight active thumbnail in drawer & grid
    updateThumbnailHighlights();
  }

  function updateNavigationButtons() {
    if (viewMode === 'spread') {
      const { left, right } = getSpreadForPage(currentPage);
      const isStart = !left && right === 1;
      const isEnd = right === TOTAL_PAGES || (left === TOTAL_PAGES && !right);
      btnPrev.disabled = isStart;
      btnFirst.disabled = isStart;
      btnPrevPageSide.disabled = isStart;

      btnNext.disabled = isEnd;
      btnLast.disabled = isEnd;
      btnNextPageSide.disabled = isEnd;
    } else {
      const isStart = currentPage <= 1;
      const isEnd = currentPage >= TOTAL_PAGES;
      btnPrev.disabled = isStart;
      btnFirst.disabled = isStart;
      btnPrevPageSide.disabled = isStart;

      btnNext.disabled = isEnd;
      btnLast.disabled = isEnd;
      btnNextPageSide.disabled = isEnd;
    }
  }

  function updateThumbnailHighlights() {
    // Thumb drawer
    document.querySelectorAll('.thumb-item').forEach(el => {
      const p = parseInt(el.dataset.page, 10);
      if (viewMode === 'spread') {
        const { left, right } = getSpreadForPage(currentPage);
        if (p === left || p === right) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      } else {
        if (p === currentPage) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Modal grid
    document.querySelectorAll('.grid-item').forEach(el => {
      const p = parseInt(el.dataset.page, 10);
      if (viewMode === 'spread') {
        const { left, right } = getSpreadForPage(currentPage);
        if (p === left || p === right) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      } else {
        if (p === currentPage) {
          el.classList.add('active');
        } else {
          el.classList.remove('active');
        }
      }
    });

    // Auto scroll drawer to active thumb
    const activeThumb = thumbList.querySelector('.thumb-item.active');
    if (activeThumb && thumbDrawer.classList.contains('open')) {
      activeThumb.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  // 3D Flip Page Forward Animation
  function flipForward() {
    if (isFlipping) return;

    if (viewMode === 'spread') {
      const currentSpread = getSpreadForPage(currentPage);
      if (currentSpread.right === TOTAL_PAGES || (currentSpread.left === TOTAL_PAGES && !currentSpread.right)) {
        return; // Reached end
      }

      // Next spread target
      let targetPage = currentSpread.right ? currentSpread.right + 1 : currentPage + 1;
      if (targetPage > TOTAL_PAGES) targetPage = TOTAL_PAGES;
      const nextSpread = getSpreadForPage(targetPage);

      const turningFrontPage = currentSpread.right;
      const turningBackPage = nextSpread.left;

      if (!turningFrontPage) return;

      isFlipping = true;
      playPaperSound();

      // Create animated 3D sheet
      const sheet = document.createElement('div');
      sheet.className = 'flip-sheet';
      sheet.style.zIndex = '100';

      sheet.innerHTML = `
        <div class="sheet-face front">
          <img src="${IMAGES_DIR}${turningFrontPage}.png" alt="Trang ${turningFrontPage}">
          <div class="sheet-lighting"></div>
        </div>
        <div class="sheet-face back">
          <img src="${IMAGES_DIR}${turningBackPage}.png" alt="Trang ${turningBackPage}">
          <div class="sheet-lighting"></div>
        </div>
      `;

      sheetsContainer.appendChild(sheet);

      // Underneath preparation:
      // Right base immediately reveals the next right page (or becomes hidden if end)
      if (nextSpread.right) {
        rightBase.style.visibility = 'visible';
        rightBaseImg.src = `${IMAGES_DIR}${nextSpread.right}.png`;
        rightBaseNum.textContent = `Trang ${nextSpread.right}`;
        rightBaseNum.style.display = 'block';
      } else {
        rightBase.style.visibility = 'hidden';
        rightBaseNum.style.display = 'none';
      }

      // Animate flip using requestAnimationFrame for smooth physics curve
      const startTime = performance.now();
      const flipDuration = 650; // ms
      const frontLighting = sheet.querySelector('.sheet-face.front .sheet-lighting');
      const backLighting = sheet.querySelector('.sheet-face.back .sheet-lighting');

      function animateFlip(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / flipDuration);

        // Ease in-out cubic
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const deg = -180 * ease;
        sheet.style.transform = `rotateY(${deg}deg)`;

        // Lighting shadow effects
        if (progress < 0.5) {
          frontLighting.style.opacity = (progress * 2 * 0.6).toFixed(2);
          backLighting.style.opacity = '0';
        } else {
          frontLighting.style.opacity = '0';
          backLighting.style.opacity = ((1 - progress) * 2 * 0.6).toFixed(2);
        }

        if (progress < 1) {
          requestAnimationFrame(animateFlip);
        } else {
          // Animation finished
          sheetsContainer.removeChild(sheet);
          currentPage = targetPage;
          renderStatic();
          isFlipping = false;
        }
      }

      requestAnimationFrame(animateFlip);

    } else {
      // Single page flip forward
      if (currentPage >= TOTAL_PAGES) return;

      isFlipping = true;
      playPaperSound();

      const targetPage = currentPage + 1;
      const sheet = document.createElement('div');
      sheet.className = 'flip-sheet';
      sheet.style.zIndex = '100';

      sheet.innerHTML = `
        <div class="sheet-face front">
          <img src="${IMAGES_DIR}${currentPage}.png" alt="Trang ${currentPage}">
          <div class="sheet-lighting"></div>
        </div>
        <div class="sheet-face back">
          <img src="${IMAGES_DIR}${targetPage}.png" alt="Trang ${targetPage}">
          <div class="sheet-lighting"></div>
        </div>
      `;

      sheetsContainer.appendChild(sheet);

      // Underneath reveals targetPage
      rightBaseImg.src = `${IMAGES_DIR}${targetPage}.png`;
      rightBaseNum.textContent = `Trang ${targetPage}`;

      const startTime = performance.now();
      const flipDuration = 550;

      function animateSingle(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / flipDuration);
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const deg = -180 * ease;
        sheet.style.transform = `rotateY(${deg}deg)`;

        if (progress < 1) {
          requestAnimationFrame(animateSingle);
        } else {
          sheetsContainer.removeChild(sheet);
          currentPage = targetPage;
          renderStatic();
          isFlipping = false;
        }
      }

      requestAnimationFrame(animateSingle);
    }
  }

  // 3D Flip Page Backward Animation
  function flipBackward() {
    if (isFlipping) return;

    if (viewMode === 'spread') {
      const currentSpread = getSpreadForPage(currentPage);
      if (!currentSpread.left && currentSpread.right === 1) {
        return; // Reached start
      }

      // Prev spread target
      let targetPage = currentSpread.left ? currentSpread.left - 1 : 1;
      if (targetPage < 1) targetPage = 1;
      const prevSpread = getSpreadForPage(targetPage);

      const turningBackPage = currentSpread.left;
      const turningFrontPage = prevSpread.right;

      if (!turningBackPage || !turningFrontPage) return;

      isFlipping = true;
      playPaperSound();

      // Create animated 3D sheet starting at -180deg (flipped to the left)
      const sheet = document.createElement('div');
      sheet.className = 'flip-sheet';
      sheet.style.zIndex = '100';
      sheet.style.transform = 'rotateY(-180deg)';

      sheet.innerHTML = `
        <div class="sheet-face front">
          <img src="${IMAGES_DIR}${turningFrontPage}.png" alt="Trang ${turningFrontPage}">
          <div class="sheet-lighting"></div>
        </div>
        <div class="sheet-face back">
          <img src="${IMAGES_DIR}${turningBackPage}.png" alt="Trang ${turningBackPage}">
          <div class="sheet-lighting"></div>
        </div>
      `;

      sheetsContainer.appendChild(sheet);

      // Underneath preparation:
      // Left base reveals prevSpread.left
      if (prevSpread.left) {
        leftBase.style.visibility = 'visible';
        leftBaseImg.src = `${IMAGES_DIR}${prevSpread.left}.png`;
        leftBaseNum.textContent = `Trang ${prevSpread.left}`;
        leftBaseNum.style.display = 'block';
      } else {
        leftBase.style.visibility = 'hidden';
        leftBaseNum.style.display = 'none';
      }

      const startTime = performance.now();
      const flipDuration = 650;
      const frontLighting = sheet.querySelector('.sheet-face.front .sheet-lighting');
      const backLighting = sheet.querySelector('.sheet-face.back .sheet-lighting');

      function animateBack(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / flipDuration);

        // Ease in-out
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const deg = -180 * (1 - ease);
        sheet.style.transform = `rotateY(${deg}deg)`;

        // Lighting shadow effects
        if (progress < 0.5) {
          backLighting.style.opacity = (progress * 2 * 0.6).toFixed(2);
          frontLighting.style.opacity = '0';
        } else {
          backLighting.style.opacity = '0';
          frontLighting.style.opacity = ((1 - progress) * 2 * 0.6).toFixed(2);
        }

        if (progress < 1) {
          requestAnimationFrame(animateBack);
        } else {
          sheetsContainer.removeChild(sheet);
          currentPage = targetPage;
          renderStatic();
          isFlipping = false;
        }
      }

      requestAnimationFrame(animateBack);

    } else {
      // Single page flip backward
      if (currentPage <= 1) return;

      isFlipping = true;
      playPaperSound();

      const targetPage = currentPage - 1;
      const sheet = document.createElement('div');
      sheet.className = 'flip-sheet';
      sheet.style.zIndex = '100';
      sheet.style.transform = 'rotateY(-180deg)';

      sheet.innerHTML = `
        <div class="sheet-face front">
          <img src="${IMAGES_DIR}${targetPage}.png" alt="Trang ${targetPage}">
          <div class="sheet-lighting"></div>
        </div>
        <div class="sheet-face back">
          <img src="${IMAGES_DIR}${currentPage}.png" alt="Trang ${currentPage}">
          <div class="sheet-lighting"></div>
        </div>
      `;

      sheetsContainer.appendChild(sheet);

      const startTime = performance.now();
      const flipDuration = 550;

      function animateSingleBack(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / flipDuration);
        const ease = progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        const deg = -180 * (1 - ease);
        sheet.style.transform = `rotateY(${deg}deg)`;

        if (progress < 1) {
          requestAnimationFrame(animateSingleBack);
        } else {
          sheetsContainer.removeChild(sheet);
          currentPage = targetPage;
          renderStatic();
          isFlipping = false;
        }
      }

      requestAnimationFrame(animateSingleBack);
    }
  }

  // Jump directly to any page
  function goToPage(target) {
    target = Math.max(1, Math.min(TOTAL_PAGES, parseInt(target, 10) || 1));
    if (target === currentPage) return;

    if (Math.abs(target - currentPage) <= 2) {
      if (target > currentPage) {
        flipForward();
      } else {
        flipBackward();
      }
    } else {
      // Direct jump with sound
      playPaperSound();
      currentPage = target;
      renderStatic();
    }
  }

  // Toggle View Mode (2 Trang vs 1 Trang)
  function setViewMode(mode) {
    if (viewMode === mode) return;
    viewMode = mode;

    if (viewMode === 'spread') {
      btnModeSpread.classList.add('active');
      btnModeSingle.classList.remove('active');
    } else {
      btnModeSingle.classList.add('active');
      btnModeSpread.classList.remove('active');
    }

    resizeBook();
    renderStatic();
  }

  // Auto-play / Slideshow
  function toggleAutoPlay() {
    if (autoPlayTimer) {
      clearInterval(autoPlayTimer);
      autoPlayTimer = null;
      btnAutoPlay.classList.remove('active');
      btnAutoPlay.querySelector('.icon-play').style.display = 'block';
      btnAutoPlay.querySelector('.icon-pause').style.display = 'none';
    } else {
      initAudio();
      btnAutoPlay.classList.add('active');
      btnAutoPlay.querySelector('.icon-play').style.display = 'none';
      btnAutoPlay.querySelector('.icon-pause').style.display = 'block';

      autoPlayTimer = setInterval(() => {
        if (viewMode === 'spread') {
          const spread = getSpreadForPage(currentPage);
          if (spread.right === TOTAL_PAGES || (spread.left === TOTAL_PAGES && !spread.right)) {
            // Loop back to start
            goToPage(1);
          } else {
            flipForward();
          }
        } else {
          if (currentPage >= TOTAL_PAGES) {
            goToPage(1);
          } else {
            flipForward();
          }
        }
      }, AUTO_PLAY_INTERVAL);
    }
  }

  // Sound Toggle
  function toggleSound() {
    soundEnabled = !soundEnabled;
    btnSound.classList.toggle('active', soundEnabled);
    btnSound.querySelector('.icon-sound-on').style.display = soundEnabled ? 'block' : 'none';
    btnSound.querySelector('.icon-sound-off').style.display = soundEnabled ? 'none' : 'block';
    if (soundEnabled) initAudio();
  }

  // Zoom Controls
  function zoomIn() {
    if (zoomScale < 3.0) {
      zoomScale = parseFloat((zoomScale + 0.25).toFixed(2));
      applyTransform();
    }
  }

  function zoomOut() {
    if (zoomScale > 0.75) {
      zoomScale = parseFloat((zoomScale - 0.25).toFixed(2));
      if (zoomScale <= 1.0) {
        panX = 0;
        panY = 0;
      }
      applyTransform();
    }
  }

  function resetZoom() {
    zoomScale = 1.0;
    panX = 0;
    panY = 0;
    applyTransform();
  }

  // Fullscreen Toggle
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      btnFullscreen.querySelector('.icon-expand').style.display = 'none';
      btnFullscreen.querySelector('.icon-compress').style.display = 'block';
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      btnFullscreen.querySelector('.icon-expand').style.display = 'block';
      btnFullscreen.querySelector('.icon-compress').style.display = 'none';
    }
  }

  // Build Thumbnail Carousel Drawer & Modal Grid
  function buildThumbnailsAndGrid() {
    // 1. Bottom Drawer Thumbnails
    thumbList.innerHTML = '';
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const item = document.createElement('div');
      item.className = 'thumb-item';
      item.dataset.page = p;
      const tagText = p === 1 ? 'Bìa trước' : p === TOTAL_PAGES ? 'Bìa sau' : p;
      item.innerHTML = `
        <img class="thumb-img" src="${IMAGES_DIR}${p}.png" alt="Trang ${p}" loading="lazy">
        <span class="thumb-label">${tagText}</span>
      `;
      item.addEventListener('click', () => {
        goToPage(p);
      });
      thumbList.appendChild(item);
    }

    // 2. Modal Grid Items
    modalGridItems.innerHTML = '';
    for (let p = 1; p <= TOTAL_PAGES; p++) {
      const card = document.createElement('div');
      card.className = 'grid-item';
      card.dataset.page = p;
      let label = `Trang ${p}`;
      if (p === 1) label = 'Trang 1 (Bìa trước)';
      if (p === TOTAL_PAGES) label = `Trang ${p} (Bìa sau)`;

      card.innerHTML = `
        <img class="grid-img" src="${IMAGES_DIR}${p}.png" alt="${label}" loading="lazy">
        <span class="grid-tag">${label}</span>
      `;
      card.addEventListener('click', () => {
        gridModal.style.display = 'none';
        goToPage(p);
      });
      modalGridItems.appendChild(card);
    }
  }

  // Setup Event Listeners
  function setupEventListeners() {
    // Window resize
    window.addEventListener('resize', () => {
      // Auto switch to single page on narrow mobile screens if desired
      if (window.innerWidth <= 768 && viewMode === 'spread') {
        setViewMode('single');
      }
      resizeBook();
    });

    // Navigation buttons
    btnNext.addEventListener('click', flipForward);
    btnPrev.addEventListener('click', flipBackward);
    btnNextPageSide.addEventListener('click', flipForward);
    btnPrevPageSide.addEventListener('click', flipBackward);
    btnFirst.addEventListener('click', () => goToPage(1));
    btnLast.addEventListener('click', () => goToPage(TOTAL_PAGES));

    // Page slider & jump input
    pageSlider.addEventListener('input', (e) => {
      goToPage(parseInt(e.target.value, 10));
    });
    btnGoToPage.addEventListener('click', () => {
      goToPage(pageNumberInput.value);
    });
    pageNumberInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        goToPage(pageNumberInput.value);
      }
    });

    // View mode toggle buttons
    btnModeSpread.addEventListener('click', () => setViewMode('spread'));
    btnModeSingle.addEventListener('click', () => setViewMode('single'));

    // Top control buttons
    btnSound.addEventListener('click', toggleSound);
    btnAutoPlay.addEventListener('click', toggleAutoPlay);
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // Zoom buttons
    btnZoomIn.addEventListener('click', zoomIn);
    btnZoomOut.addEventListener('click', zoomOut);
    btnZoomReset.addEventListener('click', resetZoom);

    // Thumbnail Drawer Toggle
    btnToggleDrawer.addEventListener('click', () => {
      thumbDrawer.classList.toggle('open');
      btnToggleDrawer.classList.toggle('active');
      updateThumbnailHighlights();
    });

    // Modal Grid Toggle
    btnGrid.addEventListener('click', () => {
      gridModal.style.display = 'flex';
      updateThumbnailHighlights();
    });
    btnCloseGrid.addEventListener('click', () => {
      gridModal.style.display = 'none';
    });
    gridModal.addEventListener('click', (e) => {
      if (e.target === gridModal) {
        gridModal.style.display = 'none';
      }
    });

    // Book Click Navigation
    rightBase.addEventListener('click', (e) => {
      if (zoomScale > 1.05) return; // In zoom mode, clicks are for panning
      flipForward();
    });
    leftBase.addEventListener('click', (e) => {
      if (zoomScale > 1.05) return;
      flipBackward();
    });

    // Touch / Swipe Navigation on book
    let touchStartX = 0;
    let touchStartY = 0;
    viewport.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    }, { passive: true });

    viewport.addEventListener('touchend', (e) => {
      if (zoomScale > 1.05) return;
      if (e.changedTouches.length === 1) {
        const dx = e.changedTouches[0].clientX - touchStartX;
        const dy = e.changedTouches[0].clientY - touchStartY;
        if (Math.abs(dx) > 45 && Math.abs(dy) < 80) {
          if (dx < 0) {
            flipForward();
          } else {
            flipBackward();
          }
        }
      }
    }, { passive: true });

    // Mouse Pan when Zoomed in
    viewport.addEventListener('mousedown', (e) => {
      if (zoomScale > 1.05) {
        isPanning = true;
        viewport.classList.add('grabbing');
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (isPanning && zoomScale > 1.05) {
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyTransform();
      }
    });

    window.addEventListener('mouseup', () => {
      if (isPanning) {
        isPanning = false;
        viewport.classList.remove('grabbing');
      }
    });

    // Mouse Wheel Zoom
    viewport.addEventListener('wheel', (e) => {
      if (e.ctrlKey || e.altKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          zoomIn();
        } else {
          zoomOut();
        }
      }
    }, { passive: false });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (document.activeElement === pageNumberInput) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault();
        flipForward();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        flipBackward();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(1);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(TOTAL_PAGES);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        zoomOut();
      } else if (e.key === '0') {
        resetZoom();
      } else if (e.key === 'Escape') {
        gridModal.style.display = 'none';
        resetZoom();
      }
    });
  }

  // Initialize
  function init() {
    preloadAllImages();
    buildThumbnailsAndGrid();
    setupEventListeners();

    if (viewMode === 'spread') {
      btnModeSpread.classList.add('active');
      btnModeSingle.classList.remove('active');
    } else {
      btnModeSingle.classList.add('active');
      btnModeSpread.classList.remove('active');
    }

    resizeBook();
    renderStatic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
