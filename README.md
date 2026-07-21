# BBAnime — sitio web

Landing page de una sola pagina para BBAnime, botellas termo personalizadas de anime
impresas en 3D. El hero es un scroll-scrubbing real (estilo paginas de producto de
Apple): la posicion de scroll controla exactamente que frame de la botella se
muestra, y los textos bubble aparecen/desaparecen por encima. HTML5 + CSS3 +
Vanilla JS, sin build step.

Generado con la skill `engineering:architecture` combinando `web-rebuilder`,
`frontend-design`, `seo-optimizer`, `video-to-website`, `seedance-loop-prompt` y
`scroll-video`. El ADR completo esta en [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
(incluye las notas de actualizacion v2, v3 y v4 con los cambios de direccion).

## Estructura

```
webbotella/
  index.html
  css/style.css
  js/app.js
  assets/video/bbanime-loop.mp4   (video original del cliente, no se usa en la pagina)
  assets/frames/frame_0001.webp   (181 frames extraidos, los usa el canvas)
  ...frame_0181.webp
  docs/ARCHITECTURE.md
  docs/SEEDANCE-PROMPT.md
  robots.txt
  sitemap.xml
  scaffold.js                     (script que genero todo esto)
```

## Ver el sitio en local

```bash
npx serve .
```

o

```bash
python -m http.server 8000
```

## Como funciona el scroll-scrubbing

`js/app.js` precarga los 181 frames (`assets/frames/frame_0001.webp` a
`frame_0181.webp`) con una barra de progreso. Una vez cargados, un
`ScrollTrigger` (`scrub: true`) mide el progreso de scroll de TODA la pagina
(desde el top de `<main>` hasta su final, justo antes del footer) y dibuja el
frame correspondiente en `<canvas>`. Como el scroll va de 0 a 1 a lo largo de
toda la web, la botella queda vestida en el hero (frame 0), se desviste durante
"Qué hacemos" / "Tu universo" / "Proceso" / "Datos", y vuelve a quedar vestida
justo en la seccion final de compra (frame 180) — el mismo loop perfecto del
video, ahora controlado por el usuario en vez de reproducirse solo.

Si el usuario deja de scrollear, el frame queda congelado ahi (no hay reloj ni
autoplay corriendo de fondo).

## Si llega un video nuevo (re-generar los frames)

1. Copiar el archivo a `assets/video/bbanime-loop.mp4` (pisa el anterior).
2. Borrar los frames viejos y re-extraer:
   ```bash
   rm assets/frames/frame_*.webp
   ffmpeg -y -i assets/video/bbanime-loop.mp4 -vf "fps=12,scale=960:540" \
     -c:v libwebp -quality 80 -compression_level 4 assets/frames/frame_%04d.webp
   ```
3. Contar cuantos frames se generaron (`ls assets/frames | wc -l`) y, si el
   numero cambio, actualizar `FRAME_COUNT` en `scaffold.js` (arriba del todo) y
   volver a correr `node scaffold.js` para que `js/app.js` quede sincronizado.

Si el video nuevo dura mucho mas o menos que ~15s, `fps=12` puede dar muchos mas
o menos frames — ajustar ese numero para mantener el peso total razonable (una
buena referencia es apuntar a 150-200 frames en total).

## Pendientes antes de publicar

- [ ] Reemplazar `https://tu-tienda-externa.com` en `index.html` (nav y seccion
      `#tienda`) por la URL real de la tienda.
- [ ] Reemplazar el dominio placeholder `bbanime.vercel.app` (meta tags, canonical,
      `sitemap.xml`, `robots.txt`) por el dominio final.
- [ ] Reemplazar links de Instagram/TikTok/email placeholder por los reales.
- [ ] Agregar imagen real para `og:image` / `twitter:image` (hoy apunta a
      `assets/img/og-image.jpg`, que todavia no existe).

## Deploy

```bash
npx vercel --prod
```
