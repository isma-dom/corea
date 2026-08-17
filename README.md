# Norea — sitio web

Landing de una sola página para Norea (bebidas funcionales en polvo).

- **Estructura**: 7 secciones a pantalla completa con scroll por diapositivas, tomada de [ordercube.de](https://ordercube.de).
- **Movimiento**: GSAP + ScrollTrigger con texto que entra letra por letra y parallax de fondos, tomado de [vita-travel.webflow.io](https://vita-travel.webflow.io).
- **Sección "Para quién"**: tarjetas que se apilan con `position:sticky`, tomada de [pxpush.com](https://pxpush.com).
- **Intro de carga**: dos tapas que se abren y palabras gigantes por turnos, tomada de [sofihealth.com](https://www.sofihealth.com).
- **Sección "Líneas"**: ficha de producto con conmutador numérico abajo a la
  derecha, inspirada en la referencia de STILL.

## Sobre las fichas de producto ("Líneas")

Las dos fichas viven en la misma celda de grid (`grid-area:1/1`), así que al
cambiar de una a otra el alto no salta. La inactiva lleva `hidden`.

Al pulsar `01` / `02` cambian a la vez: nombre, sabor, descripción, fórmula,
total, la etiqueta, el numeral gigante del fondo y la imagen. El contador `1 / 2`
de la esquina superior derecha se actualiza solo.

- Marcado como *tabs* accesibles: `role="tablist"` / `role="tab"` /
  `role="tabpanel"` con `aria-selected`, y las flechas ← → mueven entre fichas.
- La bandera `cambiando` bloquea clics repetidos mientras corre la transición.
- Con `prefers-reduced-motion` el cambio es instantáneo, sin animación.

**Para añadir una tercera línea**: duplicar un `<article class="ficha">` con
`id="ficha-3"`, agregar su botón en `.fichas-nav`, y cambiar el `/ 2` del
contador. El JavaScript no necesita tocarse, recorre lo que encuentre.

## Cómo verlo

Con XAMPP corriendo, la carpeta ya está en `htdocs`:

```bash
open http://localhost/norea/
```

No necesita PHP ni base de datos: es HTML, CSS y JS estáticos.

## Archivos

```
norea/
├── index.html          las 7 secciones
├── css/norea.css       tokens, layout, snap y estados
├── js/norea.js         animaciones e interacciones
└── imagenes/           (vacía, pendiente de fotos reales)
```

## Cómo funciona el snap

El salto entre secciones es **CSS nativo** (`scroll-snap-type: y proximity`), no
JavaScript que secuestre la rueda del mouse. Está activo solo en:

```css
@media (min-width:1024px) and (hover:hover) and (pointer:fine)
```

En móvil, tablet y con `prefers-reduced-motion` el scroll es libre.

Tres cosas que hubo que resolver:

1. **`proximity` y no `mandatory`.** Con `mandatory` el navegador obliga a caer
   siempre en un punto de anclaje, así que la sección de tarjetas apiladas —que
   no tiene ninguno, porque dura varias pantallas— quedaba inalcanzable: el
   scroll rebotaba de vuelta a la sección anterior.
2. **Secciones que no caben.** Si el contenido de una sección supera la altura de
   la pantalla, recibe la clase `no-snap`, crece a su altura natural y deja de
   hacer snap. Evita que el usuario quede atrapado en algo que no puede leer
   completo. La sección de tarjetas apiladas queda fuera del snap siempre.
3. **Enlaces del menú.** `scroll-snap-stop: always` impide que un scroll
   programático cruce varias secciones de golpe: los enlaces no funcionaban hacia
   arriba. La función `irASeccion()` desactiva el snap durante el salto y lo
   restaura al terminar.

## Sobre las animaciones

Se usa GSAP + ScrollTrigger desde CDN. **No** se usan los plugins SplitText ni
ScrollSmoother: las funciones `partirEnCaracteres()` y `partirEnLineas()` de
`js/norea.js` hacen el mismo trabajo de dividir el texto en spans con máscara.

Cada elemento se anima según su atributo `data-anim`:

| Valor       | Efecto                                              |
|-------------|-----------------------------------------------------|
| `chars`     | letra por letra desde abajo, con máscara por palabra |
| `lines`     | línea por línea, escalonadas                        |
| `stagger`   | los hijos del elemento entran en cascada            |
| `fade`      | aparece subiendo                                    |

El easing es `power3.out` en todo el sitio, igual que en la referencia.

El parallax de fondos usa `data-speed` en `.pane-media` (valores menores a 1
mueven el fondo más lento que el scroll).

## Sobre la intro de carga

Dura unos 3.4 segundos y va así:

1. Pantalla verde completa: las dos tapas (`50% + 1px` de alto cada una) están
   cerradas. El `+1px` evita la línea de subpíxel donde se juntan.
2. Se abren en vertical y descubren el fondo crema, con el contador `001` a la
   izquierda y `©año` a la derecha.
3. Pasan tres palabras —**nutre**, **tu**, **potencial**— partidas en letras que
   suben con máscara. Cada una entra, sale, y el contador avanza a `002` y `003`.
4. El bloque completo sube y aparece el sitio.

Detalles de implementación:

- **Cuántas veces se ve.** Lo controla `window.NOREA_INTRO_UNA_VEZ`, en el script
  inline al principio del `<body>`. Ahora está en `false`: la intro corre en cada
  recarga, que es lo cómodo mientras se trabaja en ella. **Antes de publicar,
  ponerlo en `true`** para que solo corra la primera visita de cada sesión y no
  se vuelva un peaje.
  Ese script consulta `sessionStorage` y `prefers-reduced-motion` *antes de
  pintar*, y solo entonces añade la clase `con-intro` al `<html>`. Sin esa clase
  la intro es `display:none`, así que no hay ni un parpadeo cuando toca saltarla.
- **Los revelados del sitio esperan.** `iniciarRevelados()` se llama cuando la
  intro termina. Si se crearan antes, los ScrollTrigger se dispararían detrás del
  overlay y el hero aparecería ya montado, sin animación.
- **Se puede saltar** con un clic o cualquier tecla.
- **Red de seguridad**: a los 8 segundos la intro se cierra sola pase lo que
  pase, para que un fallo de GSAP no deje el sitio bloqueado.
- El split de letras reutiliza `partirEnCaracteres()`, el mismo del resto del
  sitio.

Con `NOREA_INTRO_UNA_VEZ = true`, para volver a verla sin cerrar la pestaña:

```js
sessionStorage.removeItem('norea-intro')
```

## Sobre las tarjetas apiladas ("Para quién")

El apilado es **CSS puro**: cada `.stack-item` es `position:sticky` con un `top`
escalonado según su variable `--i`, de modo que se van quedando fijas una debajo
de otra y de las anteriores solo queda visible su franja de título. El alto de
esa franja es la variable `--paso` (96px).

Tres detalles que no son obvios:

- **`overflow:hidden` rompe el sticky**, porque el elemento pasa a posicionarse
  respecto a ese contenedor en vez del viewport. Por eso `.pane--stack` lleva
  `overflow:visible` y su fondo no hace parallax.
- **Un `transform` en un ancestro también lo rompe**, así que el JS anima solo
  los hijos de cada tarjeta (`.stack-num`, `.stack-titulo`, `.stack-texto`,
  `.stack-visual`), nunca el `.stack` ni el `.stack-item`.
- **El `<div class="stack-final">` no es decorativo.** Sin él, las cuatro
  tarjetas tocan el fondo del contenedor a la vez y, como miden lo mismo, quedan
  perfectamente encimadas: el apilado desaparece justo al final. Tiene que ser un
  elemento real porque el `padding` del contenedor no cuenta para el límite
  inferior de `position:sticky`.

En móvil (`max-width:767px`) y con `prefers-reduced-motion` el apilado se
desactiva: las tarjetas se leen una tras otra y el espacio final se reduce a cero.

## Pendientes antes de publicar

- [ ] **Fotos reales**: los fondos son gradientes CSS de relleno, y las tarjetas de
      producto y las cuatro tarjetas apiladas de "Para quién" tienen placeholder.
      Reemplazar por fotografía de producto, de la bebida ya preparada y de las
      cuatro situaciones de uso.
- [ ] **Dosis reales de ingredientes** en las secciones Líneas y Ciencia (las
      actuales son de ejemplo y deben coincidir entre sí y con la etiqueta).
- [ ] **Testimonios reales** con foto, de preferencia verificados.
- [ ] **Conectar el formulario**: hoy solo valida en cliente. Falta el envío a
      Mailchimp, Klaviyo o un endpoint propio (ver el `TODO` en `js/norea.js`).
- [ ] **Número de WhatsApp**: los enlaces apuntan a `https://wa.me/52` sin número.
- [ ] **Páginas legales**: aviso de privacidad, términos, envíos y devoluciones
      están enlazados a `#`.
- [ ] **Revisión regulatoria**: COFEPRIS no permite que un suplemento alimenticio
      declare que cura, previene o trata enfermedades. El copy actual está escrito
      en términos de bienestar y ya incluye la leyenda "Este producto no es un
      medicamento", pero conviene que alguien de regulatorio revise textos y
      etiquetas antes de publicar.
- [ ] **Poner `window.NOREA_INTRO_UNA_VEZ = true`** en `index.html` para que la
      intro no se repita en cada recarga.
- [ ] **Versionado de assets**: `css/norea.css?v=1` y `js/norea.js?v=1`. Subir el
      número al hacer cambios para que el navegador no sirva la versión vieja.

## Si más adelante se vende en línea

Esta landing funciona como página de marca. Para vender hace falta catálogo,
página de producto, carrito y checkout. Ahí conviene decidir entre construirlo en
PHP sobre esta base o usar una plataforma (Shopify, Tiendanube) y dejar este sitio
como la home.
