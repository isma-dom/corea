/* =========================================================
   NOREA — animaciones e interacciones
   GSAP + ScrollTrigger. El snap de secciones lo hace CSS
   (scroll-snap-type), solo en escritorio.
   ========================================================= */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  // Con scroll-snap, la restauracion automatica del navegador deja la
  // pagina a medio camino entre secciones al recargar. Mejor arrancar arriba.
  if ('scrollRestoration' in history && !location.hash) {
    history.scrollRestoration = 'manual';
  }

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esEscritorio = window.matchMedia('(min-width:1024px) and (hover:hover)').matches;

  gsap.registerPlugin(ScrollTrigger);

  /* -------------------------------------------------------
     1. UTILIDADES DE SPLIT DE TEXTO
     Sustituyen a SplitText de GSAP (plugin de pago) con el
     mismo resultado: caracteres y lineas envueltos en spans
     con mascara de overflow.
     ------------------------------------------------------- */

  // Divide en palabras -> caracteres. La palabra es la mascara.
  function partirEnCaracteres(el) {
    var texto = el.textContent;
    var palabras = texto.split(/(\s+)/);
    var chars = [];
    el.textContent = '';

    palabras.forEach(function (palabra) {
      if (/^\s+$/.test(palabra)) {
        el.appendChild(document.createTextNode(' '));
        return;
      }
      var spanPalabra = document.createElement('span');
      spanPalabra.className = 'split-word';
      // margen para que no se corten acentos ni descendentes
      spanPalabra.style.paddingBottom = '0.12em';
      spanPalabra.style.marginBottom = '-0.12em';

      Array.from(palabra).forEach(function (letra) {
        var spanChar = document.createElement('span');
        spanChar.className = 'split-char';
        spanChar.textContent = letra;
        spanPalabra.appendChild(spanChar);
        chars.push(spanChar);
      });
      el.appendChild(spanPalabra);
    });

    return chars;
  }

  // Divide en lineas reales (segun como el navegador acomoda el texto)
  function partirEnLineas(el) {
    var texto = el.textContent;
    el.textContent = '';

    var spans = texto.split(/\s+/).filter(Boolean).map(function (palabra) {
      var s = document.createElement('span');
      s.style.display = 'inline-block';
      s.textContent = palabra;
      el.appendChild(s);
      el.appendChild(document.createTextNode(' '));
      return s;
    });

    // agrupa por posicion vertical
    var lineas = [];
    var actual = null;
    var topPrevio = null;

    spans.forEach(function (s) {
      var top = Math.round(s.offsetTop);
      if (topPrevio === null || Math.abs(top - topPrevio) > 4) {
        actual = [];
        lineas.push(actual);
        topPrevio = top;
      }
      actual.push(s);
    });

    // reconstruye el nodo con una mascara por linea
    el.textContent = '';
    return lineas.map(function (palabrasLinea) {
      var mascara = document.createElement('span');
      mascara.className = 'split-line';

      var interior = document.createElement('span');
      interior.style.display = 'block';
      interior.style.willChange = 'transform';
      interior.textContent = palabrasLinea.map(function (s) { return s.textContent; }).join(' ');

      mascara.appendChild(interior);
      el.appendChild(mascara);
      return interior;
    });
  }

  /* -------------------------------------------------------
     2. ANIMACIONES DE ENTRADA POR SECCION
     ------------------------------------------------------- */
  var EASE = 'power3.out';

  function animarSeccion(pane) {
    var elementos = pane.querySelectorAll('[data-anim]');
    if (!elementos.length) return;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: pane,
        start: 'top 65%',
        once: true
      }
    });

    elementos.forEach(function (el, i) {
      var tipo = el.dataset.anim;
      var offset = i === 0 ? 0 : '-=0.55';

      if (tipo === 'chars') {
        var chars = partirEnCaracteres(el);
        tl.from(chars, {
          yPercent: 115,
          duration: 0.9,
          ease: EASE,
          stagger: { each: 0.016, from: 'start' }
        }, offset);

      } else if (tipo === 'lines') {
        var lineas = partirEnLineas(el);
        tl.from(lineas, {
          yPercent: 105,
          opacity: 0,
          duration: 0.85,
          ease: EASE,
          stagger: 0.09
        }, offset);

      } else if (tipo === 'stagger') {
        tl.set(el, { opacity: 1 }, 0);
        tl.from(el.children, {
          y: 42,
          opacity: 0,
          duration: 0.85,
          ease: EASE,
          stagger: 0.075
        }, offset);

      } else { // fade
        tl.fromTo(el,
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: EASE },
          offset
        );
      }
    });
  }

  /* -------------------------------------------------------
     2b. TARJETAS APILADAS
     El apilado lo hace CSS con position:sticky. Aqui solo se
     anima la entrada del contenido de cada tarjeta.
     IMPORTANTE: no se puede animar con transform ni el .stack ni
     los .stack-item, porque un transform en un ancestro rompe el
     sticky. Solo se animan los hijos.
     ------------------------------------------------------- */
  function animarApilado() {
    var tarjetas = document.querySelectorAll('.stack-item');

    tarjetas.forEach(function (tarjeta) {
      var partes = tarjeta.querySelectorAll('.stack-num, .stack-titulo, .stack-texto, .stack-visual');

      gsap.from(partes, {
        y: 34,
        opacity: 0,
        duration: 0.85,
        ease: EASE,
        stagger: 0.07,
        scrollTrigger: {
          trigger: tarjeta,
          start: 'top 85%',
          once: true
        }
      });
    });
  }

  /* -------------------------------------------------------
     3. PARALLAX DE FONDOS
     ------------------------------------------------------- */
  function parallax(pane) {
    var media = pane.querySelector('[data-speed]');
    if (!media) return;

    var speed = parseFloat(media.dataset.speed) || 0.9;
    var recorrido = (1 - speed) * 100;

    gsap.fromTo(media,
      { yPercent: -recorrido },
      {
        yPercent: recorrido,
        ease: 'none',
        scrollTrigger: {
          trigger: pane,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      }
    );
  }

  /* -------------------------------------------------------
     4. NAVEGACION: puntos laterales, tema y enlace activo
     ------------------------------------------------------- */

  /* scroll-snap-stop:always impide que un scroll programatico cruce
     varias secciones (los enlaces del menu no funcionaban hacia
     arriba). Se desactiva el snap mientras dura el salto y se
     restaura al terminar. */
  var timerSnap;

  function irASeccion(destino) {
    if (!destino) return;
    var html = document.documentElement;

    var restaurar = function () {
      html.style.scrollSnapType = '';
    };

    html.style.scrollSnapType = 'none';
    destino.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });

    clearTimeout(timerSnap);
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', restaurar, { once: true });
      timerSnap = setTimeout(restaurar, 1600); // respaldo por si no dispara
    } else {
      timerSnap = setTimeout(restaurar, 1000);
    }
  }

  var panes = Array.prototype.slice.call(document.querySelectorAll('.pane'));
  var header = document.querySelector('.site-header');
  var contenedorDots = document.getElementById('dots');
  var enlacesNav = Array.prototype.slice.call(document.querySelectorAll('.site-nav a'));

  // construye los puntos
  panes.forEach(function (pane, i) {
    var b = document.createElement('button');
    b.type = 'button';
    b.dataset.destino = pane.id;
    b.setAttribute('aria-label', 'Ir a ' + (pane.dataset.nombre || 'sección ' + (i + 1)));
    b.addEventListener('click', function () { irASeccion(pane); });
    contenedorDots.appendChild(b);
  });
  var dots = Array.prototype.slice.call(contenedorDots.children);

  function marcarActiva(pane) {
    var id = pane.id;

    dots.forEach(function (d) {
      d.classList.toggle('is-active', d.dataset.destino === id);
    });
    enlacesNav.forEach(function (a) {
      a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
    });
    document.body.classList.toggle('tema-claro', pane.classList.contains('is-light'));
    header.classList.toggle('is-stuck', id !== panes[0].id);
  }

  panes.forEach(function (pane) {
    if (!reduce) parallax(pane);

    ScrollTrigger.create({
      trigger: pane,
      start: 'top 50%',
      end: 'bottom 50%',
      onEnter: function () { marcarActiva(pane); },
      onEnterBack: function () { marcarActiva(pane); }
    });

    // Si el contenido no cabe en la pantalla, la seccion crece y se
    // desactiva su snap: evita que el usuario quede atrapado y que
    // el overflow:hidden del .pane recorte el contenido.
    if (esEscritorio) {
      var revisar = function () {
        var rail = pane.querySelector('.center-rail');
        var contenido = rail.querySelector('.container');
        var estilos = getComputedStyle(rail);
        var alto = contenido.scrollHeight +
                   parseFloat(estilos.paddingTop) +
                   parseFloat(estilos.paddingBottom);
        pane.classList.toggle('no-snap', alto > window.innerHeight);
      };
      revisar();
      window.addEventListener('resize', function () {
        revisar();
        ScrollTrigger.refresh();
      });
    }
  });

  marcarActiva(panes[0]);

  /* Los revelados se crean cuando la intro termina: si se crearan antes,
     se dispararian detras del overlay y el hero apareceria ya montado. */
  function iniciarRevelados() {
    panes.forEach(animarSeccion);
    animarApilado();
    ScrollTrigger.refresh();
  }

  /* -------------------------------------------------------
     5. MENU MOVIL
     ------------------------------------------------------- */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('mobile-menu');

  function alternarMenu(abrir) {
    burger.setAttribute('aria-expanded', String(abrir));
    burger.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
    if (abrir) {
      menu.hidden = false;
      requestAnimationFrame(function () { menu.classList.add('is-open'); });
      document.body.style.overflow = 'hidden';
    } else {
      menu.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { menu.hidden = true; }, 450);
    }
  }

  burger.addEventListener('click', function () {
    alternarMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') alternarMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') alternarMenu(false);
  });

  /* -------------------------------------------------------
     5a. MARQUESINA DE RESENAS
     Se duplica el juego de tarjetas de cada pista para que el
     translate de -50% caiga justo en la costura y el ciclo se vea
     continuo.
     ------------------------------------------------------- */
  document.querySelectorAll('.marquesina-pista').forEach(function (pista) {
    var originales = Array.prototype.slice.call(pista.children);

    originales.forEach(function (tarjeta) {
      var copia = tarjeta.cloneNode(true);
      copia.setAttribute('aria-hidden', 'true');
      pista.appendChild(copia);
    });
  });

  /* -------------------------------------------------------
     5b. FICHAS DE PRODUCTO
     Los numeros de abajo cambian a la vez la ficha de la
     izquierda y la imagen de la derecha.
     ------------------------------------------------------- */
  var fichas = Array.prototype.slice.call(document.querySelectorAll('.ficha'));
  var botonesFicha = Array.prototype.slice.call(document.querySelectorAll('.fichas-nav button'));
  var numeroFicha = document.getElementById('ficha-actual');
  var fichaActual = 1;
  var cambiando = false;

  function mostrarFicha(destino) {
    if (destino === fichaActual || cambiando) return;

    var saliente = fichas[fichaActual - 1];
    var entrante = fichas[destino - 1];
    var partes = entrante.querySelectorAll('.ficha-info > *, .ficha-visual');

    cambiando = true;
    fichaActual = destino;

    botonesFicha.forEach(function (b) {
      var activa = Number(b.dataset.ficha) === destino;
      b.classList.toggle('is-activa', activa);
      b.setAttribute('aria-selected', String(activa));
    });
    numeroFicha.textContent = destino;

    if (reduce) {
      saliente.hidden = true;
      saliente.classList.remove('is-activa');
      entrante.hidden = false;
      entrante.classList.add('is-activa');
      gsap.set(partes, { clearProps: 'all' });
      cambiando = false;
      return;
    }

    gsap.timeline({ onComplete: function () { cambiando = false; } })
      .to(saliente, {
        opacity: 0,
        y: -18,
        duration: 0.35,
        ease: 'power2.in'
      })
      .add(function () {
        saliente.hidden = true;
        saliente.classList.remove('is-activa');
        gsap.set(saliente, { opacity: 1, y: 0 });
        entrante.hidden = false;
        entrante.classList.add('is-activa');
      })
      .fromTo(partes,
        { opacity: 0, y: 26 },
        { opacity: 1, y: 0, duration: 0.6, ease: EASE, stagger: 0.055 }
      );
  }

  botonesFicha.forEach(function (boton) {
    boton.addEventListener('click', function () {
      mostrarFicha(Number(boton.dataset.ficha));
    });

    // flechas para moverse entre las fichas, como en un tablist
    boton.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      var paso = e.key === 'ArrowRight' ? 1 : -1;
      var siguiente = ((fichaActual - 1 + paso + fichas.length) % fichas.length) + 1;
      mostrarFicha(siguiente);
      botonesFicha[siguiente - 1].focus();
    });
  });

  /* -------------------------------------------------------
     6. PAGINACION DE FAQ
     ------------------------------------------------------- */
  var paginasFaq = document.querySelectorAll('.faq-page');
  var botonesFaq = document.querySelectorAll('.faq-dot');

  botonesFaq.forEach(function (boton) {
    boton.addEventListener('click', function () {
      var destino = boton.dataset.ir;

      paginasFaq.forEach(function (p) {
        var visible = p.dataset.pagina === destino;
        p.hidden = !visible;
        if (visible && !reduce) {
          gsap.from(p.children, {
            y: 22, opacity: 0, duration: 0.6, ease: EASE, stagger: 0.06
          });
        }
      });

      botonesFaq.forEach(function (b) {
        var activo = b === boton;
        b.classList.toggle('is-active', activo);
        b.setAttribute('aria-selected', String(activo));
      });
    });
  });

  // acordeon: solo una pregunta abierta a la vez
  document.querySelectorAll('.faq-item').forEach(function (item) {
    item.addEventListener('toggle', function () {
      if (!item.open) return;
      document.querySelectorAll('.faq-item[open]').forEach(function (otro) {
        if (otro !== item) otro.open = false;
      });
    });
  });

  /* -------------------------------------------------------
     7. FORMULARIO DE NEWSLETTER
     Validacion en cliente. Falta conectar el envio real.
     ------------------------------------------------------- */
  var form = document.querySelector('.form-newsletter');
  var mensaje = document.getElementById('form-msg');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = form.querySelector('input[type="email"]');
    var valor = input.value.trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor)) {
      mensaje.textContent = 'Escribe un correo válido para continuar.';
      mensaje.classList.add('is-error');
      input.focus();
      return;
    }

    mensaje.classList.remove('is-error');
    mensaje.textContent = '¡Listo! Revisa tu correo, ahí va tu descuento.';
    form.reset();
    // TODO: enviar a Mailchimp / Klaviyo / endpoint propio
  });

  /* -------------------------------------------------------
     8. INTRO DE CARGA (patron sofihealth)
     Dos tapas cerradas se abren en vertical, pasan tres palabras
     partidas en letras con mascara, y al final el bloque entero sube
     y descubre el sitio.
     ------------------------------------------------------- */
  function reproducirIntro(alTerminar) {
    var intro = document.getElementById('intro');

    if (!document.documentElement.classList.contains('con-intro')) {
      if (intro) intro.remove();
      alTerminar();
      return;
    }

    try { sessionStorage.setItem('norea-intro', '1'); } catch (e) {}

    var contador = document.getElementById('intro-contador');
    var palabras = Array.prototype.slice.call(intro.querySelectorAll('.intro-palabra'));

    // se reutiliza el mismo split del resto del sitio
    var letras = palabras.map(partirEnCaracteres);

    /* Tiempos de cada palabra. Se encadenan con posiciones relativas
       ('>' = cuando termina lo anterior) en vez de tiempos absolutos:
       el stagger alarga la entrada mas alla de su duration, asi que
       calcularlos a mano hacia que una palabra entrara encima de la
       anterior antes de que esta terminara de salir. */
    var ENTRA = 0.42;      // duracion de la entrada de cada letra
    var SOSTIENE = 0.10;   // cuanto se queda la palabra completa
    var SALE = 0.28;       // duracion de la salida
    var PAUSA = 0.03;      // respiro entre una palabra y la siguiente

    function terminar() {
      document.documentElement.classList.remove('con-intro');
      intro.remove();
      alTerminar();
    }

    var tl = gsap.timeline({ onComplete: terminar });

    // 1. las tapas se abren
    tl.set(letras.flat ? letras.flat() : [].concat.apply([], letras), { yPercent: 115 })
      .to('.intro-tapa--arriba', { yPercent: -100, duration: 0.95, ease: 'power3.inOut' }, 0)
      .to('.intro-tapa--abajo', { yPercent: 100, duration: 0.95, ease: 'power3.inOut' }, 0)
      .to('.intro-contador, .intro-anio', { opacity: 1, duration: 0.5, ease: EASE }, 0.45);

    // 2. las palabras entran y salen por turnos, una despues de otra
    letras.forEach(function (chars, i) {
      var marca = 'palabra' + i;

      // la primera arranca mientras las tapas siguen abriendose;
      // las demas, cuando la anterior termino de salir
      tl.addLabel(marca, i === 0 ? 0.4 : '>' + PAUSA);

      tl.call(function () {
        contador.textContent = '00' + (i + 1);
      }, null, marca);

      tl.to(chars, {
        yPercent: 0,
        duration: ENTRA,
        ease: EASE,
        stagger: 0.016
      }, marca);

      // la ultima se queda: sale junto con el bloque completo
      if (i < letras.length - 1) {
        tl.to(chars, {
          yPercent: -115,
          duration: SALE,
          ease: 'power3.in',
          stagger: 0.010
        }, '>' + SOSTIENE);
      }
    });

    // 3. el bloque entero sube y aparece el sitio
    tl.to(intro, {
      yPercent: -100,
      duration: 0.9,
      ease: 'power4.inOut'
    }, '>0.25');

    // saltarse la intro con un clic o con una tecla
    function saltar() {
      tl.progress(1);
    }
    intro.addEventListener('click', saltar);
    window.addEventListener('keydown', saltar, { once: true });

    // red de seguridad: si algo falla, la intro no bloquea el sitio
    setTimeout(function () {
      if (document.body.contains(intro)) saltar();
    }, 8000);
  }

  /* -------------------------------------------------------
     9. DETALLES
     ------------------------------------------------------- */
  document.getElementById('anio').textContent = new Date().getFullYear();
  document.getElementById('intro-anio').textContent = new Date().getFullYear();

  // todos los enlaces internos pasan por irASeccion
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === '#') return;

    a.addEventListener('click', function (e) {
      var destino = document.querySelector(href);
      if (!destino) return;
      e.preventDefault();
      irASeccion(destino);
      history.replaceState(null, '', href);
    });
  });

  window.addEventListener('load', function () {
    ScrollTrigger.refresh();
    reproducirIntro(iniciarRevelados);

    // Al recargar, el navegador restaura una posicion intermedia entre
    // secciones. Se alinea con la seccion mas cercana.
    if (esEscritorio && !location.hash && window.scrollY > 0) {
      var cercana = panes.reduce(function (mejor, pane) {
        var d = Math.abs(pane.offsetTop - window.scrollY);
        return d < mejor.d ? { pane: pane, d: d } : mejor;
      }, { pane: panes[0], d: Infinity }).pane;

      window.scrollTo({ top: cercana.offsetTop, behavior: 'instant' });
      marcarActiva(cercana);
    }
  });
})();
