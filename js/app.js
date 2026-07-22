// BBAnime — comportamiento del sitio (Lenis + GSAP ScrollTrigger)
// Scroll-scrubbing real: el frame dibujado en <canvas> es una funcion directa
// de la posicion de scroll dentro de <main> (0 = arriba del todo = botella
// vestida, 1 = abajo del todo = botella vestida otra vez, con el desvestido
// y el vestido en el medio). Si el usuario para de scrollear, el frame queda
// congelado. Los textos bubble siguen apareciendo/desapareciendo por encima.
(function () {
  "use strict";

  var FRAME_COUNT = 181;

  gsap.registerPlugin(ScrollTrigger);

  var lenis = new Lenis({
    duration: 1.2,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    smoothWheel: true
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  var canvas = document.getElementById("canvas");
  var ctx = canvas.getContext("2d");

  // ---- Anclas del nav: usar lenis.scrollTo para que quede sincronizado ----
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var target = document.getElementById(a.getAttribute("href").slice(1));
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -10 });
    });
  });

  // ---- Reveal circular del hero: se abre rapido con el primer scroll -----
  var revealDistance = window.innerHeight * 0.6;
  function updateReveal() {
    var p = Math.min(1, Math.max(0, window.scrollY / revealDistance));
    var eased = 1 - Math.pow(1 - p, 3);
    canvas.style.clipPath = "circle(" + (eased * 150) + "% at 50% 50%)";
  }
  canvas.style.clipPath = "circle(0% at 50% 50%)";
  lenis.on("scroll", updateReveal);

  // ---- Precarga de frames + loader ---------------------------------------
  var loader = document.getElementById("loader");
  var loaderBarFill = document.getElementById("loader-bar-fill");
  var loaderPercent = document.getElementById("loader-percent");
  var placeholder = document.getElementById("bottle-placeholder");
  var frames = [];
  var currentFrame = -1;
  var dpr = Math.min(window.devicePixelRatio || 1, 2);

  function pathForFrame(i) {
    return "assets/frames/frame_" + String(i + 1).padStart(4, "0") + ".webp";
  }

  function resizeCanvas() {
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    revealDistance = window.innerHeight * 0.6;
    updateReveal();
    if (currentFrame >= 0) drawFrame(currentFrame);
  }

  var IMAGE_SCALE = 0.78;
  var bgColor = "#1A1033";

  function sampleBgColor(img) {
    try {
      var tmp = document.createElement("canvas");
      tmp.width = 16; tmp.height = 16;
      var tctx = tmp.getContext("2d");
      tctx.drawImage(img, 0, 0, 16, 16);
      var d = tctx.getImageData(0, 0, 16, 16).data;
      var r = 0, g = 0, b = 0, n = 0;
      for (var i = 0; i < 16; i++) {
        [[i, 0], [i, 15], [0, i], [15, i]].forEach(function (p) {
          var k = (p[1] * 16 + p[0]) * 4;
          r += d[k]; g += d[k + 1]; b += d[k + 2]; n++;
        });
      }
      bgColor = "rgb(" + Math.round(r / n) + "," + Math.round(g / n) + "," + Math.round(b / n) + ")";
    } catch (e) {}
  }

  // Igual que bbanime.vercel.app (la referencia): "cover" achicado, relleno
  // solido con el color muestreado tal cual (sin aclarar ni filtrar) — el
  // contraste de la pagina lo dan los textos y el scrim oscuro, no un
  // tratamiento de color sobre el video.
  function drawFrame(index) {
    var img = frames[index];
    if (!img || !img.naturalWidth) return;
    var cw = window.innerWidth, ch = window.innerHeight;
    var iw = img.naturalWidth, ih = img.naturalHeight;
    var scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    var dw = iw * scale, dh = ih * scale;
    var dx = (cw - dw) / 2, dy = (ch - dh) / 2;
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }

  function initScrub() {
    var track = document.getElementById("top");
    ScrollTrigger.create({
      trigger: track,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: function (self) {
        var idx = Math.min(FRAME_COUNT - 1, Math.max(0, Math.floor(self.progress * FRAME_COUNT)));
        if (idx !== currentFrame) {
          currentFrame = idx;
          drawFrame(idx);
        }
      }
    });
  }

  function loadFrames() {
    var loaded = 0;
    var failed = 0;
    for (var i = 0; i < FRAME_COUNT; i++) {
      (function (idx) {
        var img = new Image();
        img.onload = function () {
          if (idx === 0) sampleBgColor(img);
          onSettled();
        };
        img.onerror = function () { failed++; onSettled(); };
        img.src = pathForFrame(idx);
        frames[idx] = img;
      })(i);
    }
    function onSettled() {
      loaded++;
      var pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBarFill.style.width = pct + "%";
      loaderPercent.textContent = pct + "%";
      if (loaded === FRAME_COUNT) {
        if (failed > FRAME_COUNT * 0.5) {
          // La mayoria de los frames no cargo: nos quedamos con el placeholder.
          placeholder.classList.add("visible");
          loader.classList.add("hidden");
          return;
        }
        resizeCanvas();
        currentFrame = 0;
        drawFrame(0);
        loader.classList.add("hidden");
        window.addEventListener("resize", resizeCanvas);
        initScrub();
      }
    }
  }

  loadFrames();

  // ---- Header: se esconde al bajar, vuelve al subir (asi no tapa la ------
  // botella durante el scroll principal, pero el nav sigue disponible). -----
  var header = document.getElementById("site-header");
  var lastScroll = 0;
  var navOpenRef = document.getElementById("nav-links");
  ScrollTrigger.create({
    start: "top -80",
    onUpdate: function (self) {
      var y = self.scroll();
      header.classList.toggle("scrolled", y > 80);
      var goingDown = y > lastScroll;
      var navOpen = navOpenRef && navOpenRef.classList.contains("open");
      if (!navOpen) {
        header.classList.toggle("hidden-nav", goingDown && y > 220);
      }
      lastScroll = y;
    }
  });

  // ---- Mobile nav ---------------------------------------------------------
  var toggle = document.getElementById("nav-toggle");
  var links = document.getElementById("nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    links.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        links.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- Los textos bubble aparecen/desaparecen al cruzar cada seccion -----
  // (play/reverse por umbral, no scrub continuo: asi funciona igual de bien
  // con scroll normal que con saltos de navegacion por ancla).
  function scrubReveal(el, persist) {
    gsap.set(el, { opacity: 0, y: 46 });
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.7, ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        end: "bottom 15%",
        toggleActions: persist ? "play none none none" : "play reverse play reverse"
      }
    });
  }

  document.querySelectorAll(".phase").forEach(function (section) {
    var copy = section.querySelector(".phase-copy");
    if (!copy) return;
    scrubReveal(copy, section.dataset.persist === "true");
  });

  // ---- Counters ------------------------------------------------------------
  document.querySelectorAll(".stat-number").forEach(function (el) {
    var target = parseFloat(el.dataset.value);
    var decimals = parseInt(el.dataset.decimals || "0", 10);
    gsap.fromTo(el, { textContent: 0 }, {
      textContent: target,
      duration: 1.8,
      ease: "power1.out",
      snap: { textContent: decimals === 0 ? 1 : 0.01 },
      scrollTrigger: { trigger: el.closest(".phase"), start: "top 70%", toggleActions: "play none none reverse" }
    });
  });

})();
