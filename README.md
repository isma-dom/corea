# Norea — sitio web

Landing de una sola página para Norea (bebidas funcionales en polvo).

- **Estructura**: 7 secciones a pantalla completa con scroll por diapositivas, tomada de [ordercube.de](https://ordercube.de).
- **Movimiento**: GSAP + ScrollTrigger con texto que entra letra por letra y parallax de fondos, tomado de [vita-travel.webflow.io](https://vita-travel.webflow.io).
- **Sección "Para quién"**: tarjetas que se apilan con `position:sticky`, tomada de [pxpush.com](https://pxpush.com).

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
- [ ] **Dosis reales de ingredientes** en la sección Ciencia (las actuales son de
      ejemplo).
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
- [ ] **Versionado de assets**: `css/norea.css?v=1` y `js/norea.js?v=1`. Subir el
      número al hacer cambios para que el navegador no sirva la versión vieja.

## Si más adelante se vende en línea

Esta landing funciona como página de marca. Para vender hace falta catálogo,
página de producto, carrito y checkout. Ahí conviene decidir entre construirlo en
PHP sobre esta base o usar una plataforma (Shopify, Tiendanube) y dejar este sitio
como la home.
