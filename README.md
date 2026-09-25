# web-salud-template

Template reutilizable para sitios de negocios de salud (veterinarias y consultorios dentales). HTML/CSS/JS plano, sin frameworks ni dependencias — un script de Node (`build.js`, sin librerías externas) genera un sitio estático completo por cliente a partir de un JSON con sus datos, listo para publicar en GitHub Pages.

## Demos publicadas

- Veterinaria (`clientes/huellitas.json`, preset `veterinaria-calida`): https://a01771796-alt.github.io/web-salud-template/huellitas/
- Dental (`clientes/sonrisa-clara.json`, preset `dental-clinico`): https://a01771796-alt.github.io/web-salud-template/sonrisa-clara/

Ambas están marcadas como **NEGOCIO DE PRUEBA** (datos ficticios tomados de los dummies de los bots de WhatsApp) y llevan `noindex, nofollow` porque su JSON tiene `"demo": true`.

## Estructura

```
clientes/<slug>.json     ← todos los datos del negocio (ver "Campos del JSON")
templates/
  base.css                ← estructura y layout, compartido por cualquier giro/preset
  presets/
    veterinaria-calida.css   ← paleta cálida, formas redondeadas
    dental-clinico.css       ← paleta fría, mucho blanco, líneas rectas
  script.js               ← menú móvil + scroll por anclas + mapa bajo demanda (estático, se copia tal cual)
  images/                 ← fotos de stock fuente (hero/about/og por giro), ver CREDITOS.md
build.js                  ← genera docs/<slug>/ a partir de un JSON de cliente
docs/<slug>/              ← salida (HTML real, no requiere JS para SEO) — esto es lo que sirve GitHub Pages
CREDITOS.md               ← fuente y licencia de cada imagen de stock
```

## Crear un cliente nuevo

1. Copia un JSON existente como punto de partida:
   ```
   cp clientes/huellitas.json clientes/mi-negocio-nuevo.json
   ```
   (usa `sonrisa-clara.json` si es un consultorio dental — los campos varían un poco por giro, ver abajo).

2. Edita `clientes/mi-negocio-nuevo.json` con los datos reales del negocio. Campos obligatorios: `nombre`, `giro` (`"veterinaria"` o `"dentista"`), `estilo` (`"veterinaria-calida"` o `"dental-clinico"`), `telefono`, `whatsapp`, `direccion.calle`, `horario`, `servicios`, `urlBase`. Si falta alguno, `build.js` se detiene con un mensaje diciendo cuál y en qué archivo.

3. Pon `"demo": false` (o quita el campo) cuando sea el sitio real de un cliente que ya aceptó la propuesta — así sale indexable, con `sitemap.xml` real y sin `noindex`. Mientras sea `true`, el sitio se marca como negocio de prueba/demo y no se indexa.

4. `urlBase` debe terminar en `/` y apuntar al dominio final (GitHub Pages, Cloudflare Pages, o el dominio propio) — se usa para `canonical`, `og:url`, `og:image` y el sitemap.

5. Genera el sitio:
   ```
   node build.js clientes/mi-negocio-nuevo.json
   ```
   Esto crea `docs/mi-negocio-nuevo/` completo (HTML, CSS, JS, imágenes, `robots.txt`, `sitemap.xml`, favicon).

6. Reemplaza las fotos de stock por fotos reales del negocio en `docs/mi-negocio-nuevo/images/` (`hero.jpg`, `about.jpg`, `og-image.jpg`) cuando el cliente las mande — comprímelas a ≤200 KB (≤300 KB la `og-image`, 1200×630).

7. Commit y push. GitHub Pages (configurado para servir desde `docs/` en la rama principal) publica automáticamente en `https://<usuario>.github.io/web-salud-template/mi-negocio-nuevo/`.

## Campos del JSON (referencia rápida)

Comunes a ambos giros: `nombre`, `giro`, `estilo`, `eslogan`, `telefono`, `whatsapp`, `urlBase`, `direccion` (`calle` obligatorio; `referencia`, `ciudad`, `estado`, `cp` opcionales), `lat`/`lng` (opcional, activa el mapa bajo demanda), `horario` (array de `{dias, diasSchema, abre, cierra}` o `{dias, cerrado:true}`), `urgencias`, `modalidad`, `confirmacionCitas`, `estacionamiento`, `pagos`, `promociones`, `politicaCancelacion`, `servicios` (array de `{nombre, categoria, precio, duracion, disponible, notaNoDisponible}`), `equipo` (array de `{iniciales, rol}`), `faqs` (array de `{pregunta, respuesta}`), `redes`, `colorAcento` (opcional, sobreescribe solo el acento del preset), `avisoPrivacidadContacto` (correo para el aviso de privacidad).

Solo veterinaria: `especies`, `especiesNota`, `otrosServicios`, `requisitos`.

Solo dentista: `aseguradoras`, `aseguradorasNota`, `mesesSinIntereses`, `atendemosNinos`, `facturacion`, `valoracionNota`.

## Stack y despliegue

HTML/CSS/JS plano, sin build tools ni backend. Pensado para **GitHub Pages** sirviendo desde `docs/` (cada cliente en su propia subcarpeta) — también funciona en Cloudflare Pages/Workers si se prefiere.

## Aviso de privacidad

`build.js` genera `aviso-de-privacidad.html` para cada cliente con una plantilla genérica y `PENDIENTE: revisar con asesor legal` visible en cada apartado — no es contenido legal definitivo, hay que revisarlo con un asesor antes de publicar como sitio real (no demo).
