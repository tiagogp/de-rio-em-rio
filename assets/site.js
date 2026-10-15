// Interações e animações do site. Tudo continua visível se o GSAP não carregar.
(function () {
  var calmo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };

  // Barra de cima: sólida fora da capa; links marcam a seção visível.
  var topo = $('#topo');
  var links = $$('[data-link]');
  function aoRolar() {
    topo.classList.toggle('cheia', scrollY > 60);
    var atual = null;
    links.forEach(function (a) {
      var s = $(a.getAttribute('href'));
      if (s && s.getBoundingClientRect().top < innerHeight * 0.4) atual = a;
    });
    links.forEach(function (a) { a.classList.toggle('text-ouro', a === atual); });
  }
  addEventListener('scroll', aoRolar, { passive: true });
  aoRolar();

  // Menu do celular.
  var menu = $('#menu');
  $('#abrir-menu').addEventListener('click', function () { menu.showModal(); });
  $('#fechar-menu').addEventListener('click', function () { menu.close(); });
  $$('a', menu).forEach(function (a) { a.addEventListener('click', function () { menu.close(); }); });

  // Vídeo da capa: escurece na emenda do loop.
  var capa = $('[data-capa-video]');
  var veu = $('[data-capa-veu]');
  if (!calmo) {
    capa.play().catch(function () {});
    capa.addEventListener('timeupdate', function () {
      var resta = capa.duration - capa.currentTime;
      veu.style.opacity = resta < 0.7 || capa.currentTime < 0.35 ? '1' : '0';
    });
  }

  // Vídeos tocam só quando aparecem na tela.
  var vistos = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (e.isIntersecting && !calmo) e.target.play().catch(function () {});
      else e.target.pause();
    });
  }, { threshold: 0.25 });
  $$('video[data-auto]').forEach(function (v) { vistos.observe(v); });

  // Uma pescaria: no computador, a tela fixa troca de vídeo conforme o passo.
  var tela = $('[data-tela]');
  var telaVideos = $$('video', tela);
  var passos = $$('[data-passo]');
  var telaVisivel = false;
  function ativar(i) {
    passos.forEach(function (p, j) { p.classList.toggle('ativo', i === j); });
    telaVideos.forEach(function (v, j) {
      v.classList.toggle('ativo', i === j);
      if (i === j && telaVisivel && !calmo) v.play().catch(function () {}); else v.pause();
    });
    $('[data-tela-num]').textContent = '0' + (i + 1);
    $('[data-tela-barra]').style.width = ((i + 1) / passos.length * 100) + '%';
  }
  var obsPasso = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) ativar(+e.target.dataset.passo); });
  }, { rootMargin: '-45% 0px -45% 0px' });
  passos.forEach(function (p) { obsPasso.observe(p); });
  new IntersectionObserver(function (es) {
    telaVisivel = es[0].isIntersecting;
    var v = $('video.ativo', tela);
    if (telaVisivel && !calmo) v.play().catch(function () {}); else v.pause();
  }).observe(tela);
  passos[0].classList.add('ativo');

  // Espécies: filtro por rio.
  var filtros = $$('[data-filtro]');
  filtros.forEach(function (b) {
    b.addEventListener('click', function () {
      var rio = b.dataset.filtro;
      filtros.forEach(function (o) { o.setAttribute('aria-pressed', o === b ? 'true' : 'false'); });
      $$('[data-especie]').forEach(function (li) {
        li.classList.toggle('apagada', rio !== 'todos' && li.dataset.especie.split(' ').indexOf(rio) < 0);
      });
    });
  });

  // Imagens: arrastar com o mouse, setas e ampliar ao clicar.
  var trilho = $('[data-trilho]');
  var arrasto = null;
  trilho.addEventListener('pointerdown', function (e) {
    if (e.pointerType !== 'mouse') return;
    arrasto = { x: e.clientX, s: trilho.scrollLeft, moveu: false };
  });
  addEventListener('pointermove', function (e) {
    if (!arrasto) return;
    var dx = e.clientX - arrasto.x;
    if (Math.abs(dx) > 5) { arrasto.moveu = true; trilho.classList.add('arrastando'); }
    trilho.scrollLeft = arrasto.s - dx;
  });
  addEventListener('pointerup', function () {
    if (!arrasto) return;
    var moveu = arrasto.moveu;
    arrasto = null;
    trilho.classList.remove('arrastando');
    if (moveu) trilho.dataset.moveu = '1';
  });
  function passo() { var f = $('figure', trilho); return f ? f.offsetWidth + 16 : 400; }
  $('[data-trilho-volta]').addEventListener('click', function () { trilho.scrollBy({ left: -passo(), behavior: 'smooth' }); });
  $('[data-trilho-vai]').addEventListener('click', function () { trilho.scrollBy({ left: passo(), behavior: 'smooth' }); });

  var lupa = $('.lupa');
  var fotos = $$('img', trilho);
  var vista = 0;
  function mostrar(i) {
    vista = (i + fotos.length) % fotos.length;
    $('img', lupa).src = fotos[vista].src;
    $('img', lupa).alt = fotos[vista].alt;
    $('p', lupa).textContent = fotos[vista].alt;
  }
  fotos.forEach(function (img, i) {
    img.parentNode.addEventListener('click', function () {
      if (trilho.dataset.moveu) { delete trilho.dataset.moveu; return; }
      mostrar(i); lupa.showModal();
    });
  });
  $('[data-lupa="fechar"]').addEventListener('click', function () { lupa.close(); });
  $('[data-lupa="antes"]').addEventListener('click', function () { mostrar(vista - 1); });
  $('[data-lupa="depois"]').addEventListener('click', function () { mostrar(vista + 1); });
  lupa.addEventListener('click', function (e) { if (e.target === lupa) lupa.close(); });
  lupa.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') mostrar(vista - 1);
    if (e.key === 'ArrowRight') mostrar(vista + 1);
  });

  // Trailer: o YouTube só carrega depois do clique (sem cookies até lá).
  $('#video button').addEventListener('click', function () {
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/go7JlJ3Ju-8?autoplay=1&rel=0';
    f.title = 'Trailer de De Rio em Rio';
    f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    f.allowFullscreen = true;
    f.className = 'absolute inset-0 size-full';
    this.replaceWith(f);
  });

  // Copiar o SHA-256.
  $('#copiar').addEventListener('click', function () {
    var b = $('span', this);
    navigator.clipboard.writeText($('#sha').textContent).then(function () {
      b.textContent = 'Copiado';
      setTimeout(function () { b.textContent = 'Copiar'; }, 2000);
    });
  });

  // Animações com GSAP.
  function animar() {
    if (calmo || !window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.from('[data-intro]', { y: 40, opacity: 0, duration: 1.2, stagger: 0.12, ease: 'power3.out', delay: 0.15 });
    gsap.to(capa, { scale: 1.12, yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#capa', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('[data-capa-conteudo]', { y: -80, opacity: 0, ease: 'none', scrollTrigger: { trigger: '#capa', start: '20% top', end: '80% top', scrub: true } });

    $$('[data-reveal]').forEach(function (el) {
      gsap.from(el, { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
    $$('[data-reveal-grupo]').forEach(function (g) {
      gsap.from(g.children, { y: 50, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'power3.out', scrollTrigger: { trigger: g, start: 'top 85%' } });
    });

    $$('[data-conta]').forEach(function (el) {
      var fim = +el.dataset.conta, n = { v: 0 };
      gsap.to(n, { v: fim, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' },
        onUpdate: function () { el.textContent = Math.round(n.v); } });
    });

    // Rios: o painel de baixo cobre o de cima, que recua e escurece.
    var rios = $$('[data-rio]');
    rios.forEach(function (r, i) {
      var dentro = $('[data-rio-dentro]', r);
      gsap.from($$('h3, [data-rio-dentro] > div > div > span, dl', r), { y: 60, opacity: 0, duration: 1, stagger: 0.1, ease: 'power3.out',
        scrollTrigger: { trigger: r, start: 'top 60%' } });
      if (i < rios.length - 1) {
        gsap.to(dentro, { scale: 0.9, opacity: 0.35, borderRadius: '28px', ease: 'none',
          scrollTrigger: { trigger: rios[i + 1], start: 'top bottom', end: 'top top', scrub: true } });
      }
    });
  }
  animar();
})();
