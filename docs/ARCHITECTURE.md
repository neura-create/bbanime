# ADR-001: Arquitectura del sitio BBAnime

**Status:** Accepted (ver notas de actualizacion v2, v3 y v4 abajo)
**Date:** 2026-07-19
**Deciders:** Cliente BBAnime, Grow Estudio Digital

## Actualizacion v4 (2026-07-21)

Llego el video final del cliente (`hf_20260721_192343_...mp4`, 1280x720, 24fps,
~15s: botella vestida que se desviste, flota y se vuelve a vestir en loop
perfecto). El cliente pidio cambiar de "loop autoplay de fondo" a **scroll-
scrubbing real, estilo paginas de producto de Apple**: la posicion de scroll
controla exactamente que frame se muestra, y la animacion se congela si el
usuario deja de scrollear.

Implementacion:

- Se extrajeron **181 frames** con `ffmpeg` (`fps=12,scale=960:540`, ver
  comando abajo) a `assets/frames/frame_0001.webp` ... `frame_0181.webp`.
  **Se uso WebP en vez del PNG pedido originalmente**: 181 frames en PNG
  (sin compresion con perdida) hubieran pesado varias decenas de MB; en WebP
  calidad 80 el total quedo en ~3.55MB. Si en algun momento se necesita PNG
  por algun motivo puntual, es un solo flag de ffmpeg para regenerar.
- `js/app.js` precarga los 181 frames al cargar la pagina (con barra de
  progreso), y un `ScrollTrigger` con `scrub: true` sobre `<main>` (de "top
  top" a "bottom bottom") mapea el progreso de scroll de TODA la pagina
  (0 a 1) al indice de frame correspondiente, dibujado en `<canvas>` (no
  `<img>`, para que el cambio de frame sea instantaneo y sin parpadeos).
- El `<video autoplay loop>` de la v3 se elimino: ya no aplica, porque ahora
  el frame depende del scroll, no de un reloj interno del video.
- El placeholder CSS animado de las versiones anteriores se mantiene como
  **fallback de emergencia** (si mas de la mitad de los frames no llegan a
  cargar), pero ya no es el camino principal.
- El archivo de video original se copio a
  `assets/video/bbanime-loop.mp4` (queda como fuente, no se usa directamente
  en la pagina).

```bash
ffmpeg -y -i assets/video/bbanime-loop.mp4 -vf "fps=12,scale=960:540" \
  -c:v libwebp -quality 80 -compression_level 4 assets/frames/frame_%04d.webp
```

## Actualizacion v3 (2026-07-20)

El cliente aclaro que la botella tenia que quedar fija de fondo en toda la web
(no en un portal circular acotado). En ese momento, sin el video final todavia,
se implemento como loop autoplay 100% CSS. Esto fue reemplazado en v4 por el
scroll-scrubbing real descripto arriba.

## Actualizacion v2 (2026-07-20)

El cliente compartio capturas de un video de referencia con la direccion visual
que quiere: fondo cosmico navy/violeta, tipografia bubble rosa/blanca, sparkles y
stats con iconos. Se rehizo la piel visual completa (paleta, tipografia, copy,
iconografia). Esta parte se mantiene sin cambios en v4.

## Contexto

BBAnime vende botellas termo personalizadas de anime, impresas en 3D. La landing
page de una sola pagina usa el video del producto como "hero" scroll-scrubbeado
(estilo Apple), con texto que aparece/desaparece por encima, y deriva el trafico
a una tienda externa.

Skills usadas en este proyecto: `web-rebuilder`, `frontend-design`, `seo-optimizer`,
`video-to-website`, `seedance-loop-prompt`, `scroll-video`.

## Decision

Sitio estatico HTML5 + CSS3 + Vanilla JS (sin build step ni framework). Los 181
frames viven en `.bg-scene` (`position: fixed`, detras de todo el contenido) y se
dibujan en `<canvas>` segun el progreso de scroll de `<main>`. El contenido
(`main`) scrollea normalmente encima, en `position: relative` con z-index mayor;
cada seccion (`.phase`) aparece y desaparece con un fundido controlado por scroll
(`GSAP ScrollTrigger` con `scrub: true`), sin tarjetas ni fondos propios.

## Opciones consideradas

### Opcion A: HTML/CSS/JS vanilla + canvas scroll-scrub (elegida)
| Dimension | Evaluacion |
|---|---|
| Complejidad | Media (precarga de 181 imagenes + mapeo de scroll) |
| Costo | Ninguno (sin dependencias de build) |
| Fidelidad al pedido | Alta: es exactamente el patron de las paginas de producto de Apple |

**Pros:** control total del frame mostrado, se congela al parar de scrollear,
sin dependencias de reproduccion de video (autoplay policies, buffering).
**Contras:** requiere precargar 181 imagenes al entrar al sitio (~3.55MB).

### Opcion B: `<video>` con `currentTime` controlado por scroll
| Dimension | Evaluacion |
|---|---|
| Complejidad | Media-alta (seeking de video no es instantaneo entre keyframes) |
| Fidelidad al pedido | Media: puede tener micro-lag/parpadeos al saltar entre frames, que es
exactamente lo que el cliente pidio evitar ("sin parpadeos") |

**Motivo del descarte:** buscar (`seek`) un `<video>` cuadro a cuadro via scroll
no es instantaneo (el navegador tiene que decodificar hasta el keyframe mas
cercano), lo que genera el parpadeo que el cliente explicitamente pidio evitar.
El canvas con imagenes precargadas dibuja cada frame de forma instantanea.

## Consequences

- El peso inicial de carga subio en ~3.55MB (los 181 frames WebP). Aceptable para
  una landing de marca con un loader visible durante la precarga.
- Si el cliente manda un video nuevo, hay que volver a correr el comando ffmpeg de
  arriba (o ajustar `fps`/`scale` si el peso final no convence) y actualizar
  `FRAME_COUNT` en `scaffold.js` si la cantidad de frames cambia.
- El link a la tienda externa y el dominio final son placeholders que hay que
  reemplazar.

## Action items

1. [x] Cliente entrego el video final y se extrajeron los 181 frames
2. [ ] Reemplazar la URL placeholder de la tienda externa (nav + seccion `#tienda`)
3. [ ] Reemplazar dominio placeholder (`bbanime.vercel.app`) por el dominio final en
       meta tags, canonical, sitemap.xml y robots.txt
4. [ ] Reemplazar links de Instagram/TikTok/email placeholder por los reales
5. [ ] Deploy: `npx vercel --prod`
