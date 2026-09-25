#!/usr/bin/env node
// Genera un sitio estático completo en docs/<slug>/ a partir de un JSON de cliente.
// Uso: node build.js clientes/<slug>.json
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const TEMPLATES = path.join(ROOT, "templates");

const SCHEMA_TYPE = { veterinaria: "VeterinaryCare", dentista: "Dentist" };
const IMAGE_PREFIX = { veterinaria: "veterinaria", dentista: "dental" };
const DAY_ES_TO_EN = {
  Lunes: "Monday", Martes: "Tuesday", "Miércoles": "Wednesday", Jueves: "Thursday",
  Viernes: "Friday", "Sábado": "Saturday", Domingo: "Sunday",
};

// ---------- validación ----------
function requireField(data, field, file) {
  const parts = field.split(".");
  let value = data;
  for (const part of parts) value = value ? value[part] : undefined;
  const empty = value === undefined || value === null || value === "" ||
    (Array.isArray(value) && value.length === 0);
  if (empty) throw new Error(`Falta el campo obligatorio "${field}" en ${file}`);
  return value;
}

function validate(data, file) {
  const required = ["nombre", "giro", "estilo", "telefono", "whatsapp", "direccion", "direccion.calle", "horario", "servicios", "urlBase"];
  for (const field of required) requireField(data, field, file);

  if (!SCHEMA_TYPE[data.giro]) {
    throw new Error(`"giro" inválido ("${data.giro}") en ${file} — debe ser uno de: ${Object.keys(SCHEMA_TYPE).join(", ")}`);
  }
  const presetFile = path.join(TEMPLATES, "presets", `${data.estilo}.css`);
  if (!fs.existsSync(presetFile)) {
    throw new Error(`"estilo" inválido ("${data.estilo}") en ${file} — no existe templates/presets/${data.estilo}.css`);
  }
  data.servicios.forEach((s, i) => {
    for (const f of ["nombre", "categoria", "precio"]) {
      if (!s[f]) throw new Error(`Falta "${f}" en servicios[${i}] de ${file}`);
    }
  });
  data.horario.forEach((h, i) => {
    if (!h.dias) throw new Error(`Falta "dias" en horario[${i}] de ${file}`);
    if (!h.cerrado && (!h.abre || !h.cierra)) {
      throw new Error(`horario[${i}] de ${file} necesita "abre"/"cierra", o "cerrado": true`);
    }
  });
}

// ---------- helpers ----------
const esc = (str) => String(str ?? "").replace(/[&<>"']/g, (c) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[c]));

function waLink(whatsapp, message) {
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
}

function groupBy(items, key) {
  const groups = new Map();
  for (const item of items) {
    const k = item[key];
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(item);
  }
  return groups;
}

// ---------- secciones HTML ----------
function renderHead(data) {
  const desc = `${data.nombre} — ${data.eslogan || (data.giro === "veterinaria" ? "veterinaria" : "consultorio dental")} en ${data.direccion.ciudad || "tu ciudad"}. Agenda por WhatsApp.`;
  const ogImage = `${data.urlBase}images/og-image.jpg`;
  const robotsTag = data.demo ? `\n<meta name="robots" content="noindex, nofollow">` : "";

  const horarioSpec = data.horario.filter((h) => !h.cerrado).map((h) => `    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": [${h.diasSchema ? h.diasSchema.map((d) => `"${d}"`).join(", ") : `"${DAY_ES_TO_EN[h.dias] || h.dias}"`}],
      "opens": "${h.abre}",
      "closes": "${h.cierra}"
    }`).join(",\n");

  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(data.nombre)} — ${esc(data.eslogan || (data.giro === "veterinaria" ? "Veterinaria" : "Consultorio dental"))}</title>${robotsTag}

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${data.giro === "veterinaria"
    ? `<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700&family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">`
    : `<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">`}

<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${data.urlBase}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(data.nombre)}">
<meta property="og:title" content="${esc(data.nombre)} — ${esc(data.eslogan || "")}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${data.urlBase}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:secure_url" content="${ogImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:locale" content="es_MX">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(data.nombre)} — ${esc(data.eslogan || "")}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">

<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="stylesheet" href="style.css">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "${SCHEMA_TYPE[data.giro]}",
  "name": "${esc(data.nombre)}",
  "image": "${ogImage}",
  "url": "${data.urlBase}",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "${esc(data.direccion.calle)}",
    "addressLocality": "${esc(data.direccion.ciudad || "")}",
    "addressRegion": "${esc(data.direccion.estado || "")}",
    "postalCode": "${esc(data.direccion.cp || "")}",
    "addressCountry": "MX"
  },${data.lat && data.lng ? `
  "geo": { "@type": "GeoCoordinates", "latitude": ${data.lat}, "longitude": ${data.lng} },` : ""}
  "telephone": "${esc(data.telefono)}",
  "openingHoursSpecification": [
${horarioSpec}
  ]${data.giro === "dentista" && data.aseguradoras ? `,
  "description": "Aceptamos ${data.aseguradoras.join(", ")}${data.aseguradorasNota ? " (" + data.aseguradorasNota + ")" : ""}"` : ""}
}
</script>`;
}

function renderHeader(data, homePrefix = "") {
  const initials = data.nombre.split(" ").filter((w) => w[0] === w[0].toUpperCase()).slice(0, 2).map((w) => w[0]).join("") || data.nombre.slice(0, 2).toUpperCase();
  const citaMsg = `Hola, quiero agendar una cita en ${data.nombre}`;
  return `<header class="site-header">
  <div class="header-inner">
    <a href="${homePrefix}#top" class="brand">
      <span class="brand-badge" aria-hidden="true">${esc(initials)}</span>
      <span class="brand-name">${esc(data.nombre.split(" ")[0])}<small>${esc(data.nombre.split(" ").slice(1).join(" "))}</small></span>
    </a>
    <nav class="main-nav" id="main-nav">
      <a href="${homePrefix}#top">Inicio</a>
      <a href="${homePrefix}#servicios">Servicios</a>
      <a href="${homePrefix}#nosotros">Nosotros</a>
      <a href="${homePrefix}#faq">Preguntas</a>
      <a href="${homePrefix}#ubicacion">Ubicación</a>
    </nav>
    <div class="header-actions">
      <a class="btn btn-primary" href="${waLink(data.whatsapp, citaMsg)}" target="_blank" rel="noopener">Agenda tu cita</a>
      <button class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="main-nav" aria-label="Abrir menú"><span></span></button>
    </div>
  </div>
</header>`;
}

function renderUrgencias(data) {
  if (!data.urgencias) return "";
  const telHref = `tel:${data.telefono.replace(/[^+\d]/g, "")}`;
  return `<div class="urgencias-banner">
  <div class="container">
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
    <span>${esc(data.urgencias)} — <a href="${telHref}">Llamar ahora</a></span>
  </div>
</div>`;
}

function renderHero(data) {
  const citaMsg = `Hola, quiero agendar una cita en ${data.nombre}`;
  const ciudadTxt = data.direccion.ciudad ? ` en ${data.direccion.ciudad}` : "";
  return `<!-- FOTO PLACEHOLDER: reemplazar por foto real del local; esta es una foto de stock de referencia de estilo (ver CREDITOS.md) -->
<section class="hero${data.urgencias ? " has-urgencias" : ""}" id="top">
  <div class="hero-bg" role="img" aria-label="Ambientación de ${data.giro === "veterinaria" ? "clínica veterinaria" : "consultorio dental"}, foto de referencia"></div>
  <div class="container hero-content">
    <span class="eyebrow">${esc(data.giro === "veterinaria" ? "Veterinaria" : "Consultorio dental")}${ciudadTxt}</span>
    <h1>${esc(data.nombre)}</h1>
    ${data.eslogan ? `<p class="lead">${esc(data.eslogan)}</p>` : ""}
    ${data.demo ? `<span class="demo-tag">Sitio de ejemplo · datos ficticios</span>` : ""}
    <div class="hero-actions">
      <a class="btn btn-primary" href="${waLink(data.whatsapp, citaMsg)}" target="_blank" rel="noopener">
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7C28.7 8.7 23 3 16 3zm0 23c-2 0-3.9-.5-5.6-1.5l-.4-.2-4 1.2 1.2-3.9-.3-.4C5.8 19.6 5 17.7 5 15.7 5 9.7 9.9 4.8 16 4.8s11 4.9 11 10.9S22.1 26 16 26z"/></svg>
        Agenda por WhatsApp
      </a>
      <a class="btn btn-outline" href="#servicios">Ver servicios</a>
    </div>
  </div>
</section>`;
}

function renderAbout(data) {
  const facts = [];
  const diasAbiertos = data.horario.filter((h) => !h.cerrado).reduce((n, h) => n + (h.diasSchema ? h.diasSchema.length : 1), 0);
  if (diasAbiertos > 0) facts.push([diasAbiertos, "Días a la semana abierto"]);
  if (data.giro === "dentista" && data.aseguradoras) facts.push([data.aseguradoras.length, "Aseguradoras aceptadas"]);

  return `<section class="about" id="nosotros">
  <div class="container about-grid">
    <!-- FOTO PLACEHOLDER: reemplazar por foto real del local o del equipo; esta es una foto de stock de referencia de estilo (ver CREDITOS.md) -->
    <div class="about-card">
      <img src="images/about.jpg" alt="Ambientación de ${data.giro === "veterinaria" ? "clínica veterinaria" : "consultorio dental"}, foto de referencia" width="800" height="1000" loading="lazy">
    </div>
    <div class="about-text">
      <span class="eyebrow">Quiénes somos</span>
      <h2>${data.giro === "veterinaria" ? "Cuidado cercano, paso a paso" : "Tu sonrisa, en manos de confianza"}</h2>
      <p>${esc(data.nombre)} atiende ${data.direccion.ciudad ? "en " + esc(data.direccion.ciudad) : ""}${data.direccion.referencia ? ", " + esc(data.direccion.referencia) : ""}. ${esc(data.copyWeb && data.copyWeb.modalidad || "")}</p>
      ${data.valoracionNota ? `<p>${esc(data.valoracionNota)}</p>` : ""}
      <!-- PENDIENTE: confirmar año de apertura, historia y tamaño real del equipo -->
      ${facts.length ? `<div class="about-facts">
        ${facts.slice(0, 3).map(([n, l]) => `<div class="about-fact"><strong>${esc(n)}</strong><span>${esc(l)}</span></div>`).join("\n        ")}
      </div>` : ""}
    </div>
  </div>
</section>`;
}

function renderServicios(data) {
  const ocultarNoDisponibles = data.serviciosNoDisponibles === "ocultar";
  const groups = groupBy(data.servicios, "categoria");
  const categorias = [...groups.entries()].map(([cat, itemsAll]) => {
    const items = ocultarNoDisponibles ? itemsAll.filter((s) => s.disponible !== false) : itemsAll;
    if (!items.length) return "";
    const rows = items.map((s) => `      <div class="servicio-row${s.disponible === false ? " no-disponible" : ""}">
        <div class="servicio-info">
          <span class="servicio-nombre">${esc(s.nombre)}</span>
          ${s.duracion && s.duracion !== "—" ? `<span class="servicio-duracion">${esc(s.duracion)}</span>` : ""}
          ${s.disponible === false ? `<span class="servicio-nota-disp">Próximamente</span>` : ""}
        </div>
        <span class="servicio-precio">${esc(s.precio)}</span>
      </div>`).join("\n");
    const catMsg = `Hola, quisiera más información sobre servicios de ${cat.toLowerCase()}`;
    return `    <div class="servicios-categoria">
      <h3>${esc(cat)}</h3>
${rows}
      <p class="services-note"><a href="${waLink(data.whatsapp, catMsg)}" target="_blank" rel="noopener">Pregunta por WhatsApp →</a></p>
    </div>`;
  }).filter(Boolean).join("\n");

  return `<section id="servicios">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Lo que hacemos</span>
      <h2>Servicios y precios</h2>
      <p>El precio final se confirma en consulta/valoración. Los precios "desde" varían según el caso.</p>
    </div>
${categorias}
  </div>
</section>`;
}

function renderEquipo(data) {
  if (!data.equipo || !data.equipo.length) return "";
  return `<section class="about" id="equipo">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Nuestro equipo</span>
      <h2>Quién te va a atender</h2>
    </div>
    <div class="equipo-grid">
      ${data.equipo.map((m) => `<div class="equipo-card">
        <div class="equipo-avatar">${esc(m.iniciales)}</div>
        <h3>${esc(m.nombre || m.rol)}</h3>
        ${m.nombre ? `<p>${esc(m.rol)}</p>` : ""}
      </div>`).join("\n      ")}
    </div>
  </div>
</section>`;
}

function renderPorque(data) {
  const items = [];
  if (data.urgencias) items.push(["Urgencias", data.urgencias]);
  if (data.pagos) items.push(["Formas de pago", data.pagos.join(", ")]);
  if (data.mesesSinIntereses) items.push(["Meses sin intereses", data.mesesSinIntereses]);
  if (data.aseguradoras) items.push(["Aseguradoras", `${data.aseguradoras.join(", ")}${data.aseguradorasNota ? " — " + data.aseguradorasNota : ""}`]);
  if (data.atendemosNinos) items.push(["Odontopediatría", "Contamos con atención dental especializada para niños"]);
  if (data.facturacion) items.push(["Facturación", data.facturacion]);
  if (data.estacionamiento) items.push(["Estacionamiento", data.estacionamiento]);
  if (data.politicaCancelacion) items.push(["Cancelaciones", data.politicaCancelacion]);
  if (!items.length) return "";
  return `<section id="porque-elegirnos">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Por qué elegirnos</span>
      <h2>Lo que debes saber antes de venir</h2>
    </div>
    <div class="porque-grid">
      ${items.map(([t, d]) => `<div class="porque-card"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join("\n      ")}
    </div>
  </div>
</section>`;
}

function renderFaqs(data) {
  if (!data.faqs || !data.faqs.length) return "";
  return `<section class="about" id="faq">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Preguntas frecuentes</span>
      <h2>Resolvemos tus dudas</h2>
    </div>
    <div class="faq-list">
      ${data.faqs.map((f) => `<details class="faq-item">
        <summary>${esc(f.pregunta)}</summary>
        <p>${esc(f.respuesta)}</p>
      </details>`).join("\n      ")}
    </div>
  </div>
</section>`;
}

function renderUbicacion(data) {
  const horarioLines = data.horario.map((h) => h.cerrado ? `<p>${esc(h.dias)}: Cerrado</p>` : `<p>${esc(h.dias)}: ${esc(h.abre)} – ${esc(h.cierra)}</p>`).join("\n        ");
  const ciudadEstado = data.direccion.ciudad === data.direccion.estado ? [data.direccion.ciudad] : [data.direccion.ciudad, data.direccion.estado];
  const direccionTxt = [data.direccion.calle, data.direccion.referencia, ...ciudadEstado].filter(Boolean).join(", ");
  return `<section class="about" id="ubicacion">
  <div class="container">
    <div class="section-head">
      <span class="eyebrow">Visítanos</span>
      <h2>Nuestra ubicación</h2>
    </div>
    <div class="location-grid">
      <div class="location-card">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.3 7-12a7 7 0 1 0-14 0c0 4.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
        <h3>Dirección</h3>
        <p>${esc(direccionTxt)}</p>
      </div>
      <div class="location-card">
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
        <h3>Horario</h3>
        ${horarioLines}
      </div>
      <div class="location-card">
        <svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7C28.7 8.7 23 3 16 3z"/></svg>
        <h3>Contacto</h3>
        <p>WhatsApp / Tel: ${esc(data.telefono)}</p>
      </div>
    </div>
    ${data.lat && data.lng ? `<div class="map-placeholder" id="map-placeholder" data-lat="${data.lat}" data-lng="${data.lng}" data-title="Ubicación de ${esc(data.nombre)}">
      <button type="button" class="btn btn-light map-trigger" id="map-trigger">Toca para ver el mapa</button>
    </div>` : ""}
  </div>
</section>`;
}

function renderContacto(data) {
  const citaMsg = `Hola, quiero agendar una cita en ${data.nombre}`;
  const direccionTxt = [data.direccion.calle, data.direccion.referencia].filter(Boolean).join(", ");
  return `<section class="contact" id="contacto">
  <div class="container contact-grid">
    <div>
      <span class="eyebrow">Hablemos</span>
      <h2>Agenda tu cita</h2>
      <p class="lead">La forma más rápida de agendar es por WhatsApp.</p>
      <div class="contact-list">
        <div class="contact-item">
          <svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7C28.7 8.7 23 3 16 3z"/></svg>
          <a href="${waLink(data.whatsapp, citaMsg)}" target="_blank" rel="noopener">WhatsApp: ${esc(data.telefono)}</a>
        </div>
        <div class="contact-item">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s7-7.3 7-12a7 7 0 1 0-14 0c0 4.7 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>${esc(direccionTxt)}</span>
        </div>
      </div>
    </div>
    <div class="contact-card">
      <h3>Agenda en un clic</h3>
      <p>Cuéntanos qué necesitas y qué día te queda mejor.</p>
      <a class="btn btn-primary" href="${waLink(data.whatsapp, citaMsg)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>
    </div>
  </div>
</section>`;
}

function renderFooter(data, homePrefix = "") {
  const demoLine = data.demo
    ? `<!-- PENDIENTE: dominio final antes de entregar --> ${esc(data.nombre)} — <span class="demo-tag">Sitio de ejemplo · datos ficticios</span>`
    : `© ${new Date().getFullYear()} ${esc(data.nombre)}. <a href="aviso-de-privacidad.html">Aviso de privacidad</a>.`;
  return `<footer class="site-footer">
  <div class="container footer-grid">
    <div class="footer-brand">
      <span class="brand-name">${esc(data.nombre)}</span>
      ${data.eslogan ? `<p>${esc(data.eslogan)}</p>` : ""}
    </div>
    <div class="footer-col">
      <h4>Explora</h4>
      <ul>
        <li><a href="${homePrefix}#top">Inicio</a></li>
        <li><a href="${homePrefix}#servicios">Servicios</a></li>
        <li><a href="${homePrefix}#ubicacion">Ubicación</a></li>
      </ul>
    </div>
    <div class="footer-col">
      <h4>Contacto</h4>
      <ul>
        <li><a href="https://wa.me/${data.whatsapp}" target="_blank" rel="noopener">WhatsApp</a></li>
        <li><span>${esc(data.telefono)}</span></li>
      </ul>
    </div>
  </div>
  <div class="footer-bottom">${demoLine}</div>
</footer>`;
}

function renderWhatsappFloat(data) {
  const msg = `Hola, quiero agendar una cita en ${data.nombre}`;
  return `<a class="whatsapp-float" href="${waLink(data.whatsapp, msg)}" target="_blank" rel="noopener" aria-label="Agenda tu cita por WhatsApp">
  <svg aria-hidden="true" viewBox="0 0 32 32" fill="currentColor"><path d="M16 3C9 3 3.3 8.7 3.3 15.7c0 2.5.7 4.8 1.9 6.8L3 29l6.7-2.1c1.9 1 4 1.6 6.3 1.6 7 0 12.7-5.7 12.7-12.7C28.7 8.7 23 3 16 3zm0 23c-2 0-3.9-.5-5.6-1.5l-.4-.2-4 1.2 1.2-3.9-.3-.4C5.8 19.6 5 17.7 5 15.7 5 9.7 9.9 4.8 16 4.8s11 4.9 11 10.9S22.1 26 16 26z"/></svg>
</a>`;
}

function renderIndex(data) {
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
${renderHead(data)}
</head>
<body>
${renderHeader(data)}
${renderUrgencias(data)}
${renderHero(data)}
${renderAbout(data)}
${renderServicios(data)}
${renderEquipo(data)}
${renderPorque(data)}
${renderFaqs(data)}
${renderUbicacion(data)}
${renderContacto(data)}
${renderFooter(data)}
${renderWhatsappFloat(data)}
<script src="script.js"></script>
</body>
</html>
`;
}

function renderAvisoPrivacidad(data) {
  const robotsTag = data.demo ? `\n<meta name="robots" content="noindex, nofollow">` : "";
  const apartados = [
    ["Responsable", `${data.nombre}, con domicilio en ${data.direccion.calle}${data.direccion.ciudad ? ", " + data.direccion.ciudad : ""}, es responsable del tratamiento de sus datos personales.`],
    ["Datos que recabamos", "Nombre, teléfono/WhatsApp y, en su caso, correo electrónico, cuando usted los proporciona para agendar una cita o solicitar información."],
    ["Finalidad", "Agendar y confirmar citas, dar seguimiento a su atención y responder dudas sobre nuestros servicios."],
    ["Uso de WhatsApp", "Las conversaciones por WhatsApp se usan únicamente para coordinar su cita y atención; no se comparten con terceros ajenos al servicio."],
    ["Derechos ARCO", `Usted puede solicitar acceso, rectificación, cancelación u oposición al uso de sus datos escribiendo a ${data.avisoPrivacidadContacto || "[PENDIENTE: correo de contacto]"}.`],
    ["Cambios al aviso", "Este aviso puede actualizarse; la versión vigente siempre estará disponible en esta página."],
  ];
  return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Aviso de privacidad — ${esc(data.nombre)}</title>${robotsTag}
<meta name="description" content="Aviso de privacidad de ${esc(data.nombre)}.">
<link rel="canonical" href="${data.urlBase}aviso-de-privacidad.html">
<link rel="icon" type="image/svg+xml" href="favicon.svg">
<link rel="stylesheet" href="style.css">
</head>
<body>
${renderHeader(data, "index.html")}
<section class="legal">
  <div class="container">
    <h1>Aviso de privacidad</h1>
    <span class="pendiente">PENDIENTE: revisar con asesor legal antes de publicar</span>
    ${apartados.map(([t, d]) => `<h2>${esc(t)}</h2>\n    <p>${esc(d)}</p>\n    <span class="pendiente">PENDIENTE: revisar con asesor legal</span>`).join("\n    ")}
  </div>
</section>
${renderFooter(data, "index.html")}
${renderWhatsappFloat(data)}
<script src="script.js"></script>
</body>
</html>
`;
}

function renderFavicon(data) {
  const initials = data.nombre.split(" ").filter((w) => w[0] === w[0].toUpperCase()).slice(0, 2).map((w) => w[0]).join("") || "?";
  const color = data.giro === "veterinaria" ? "#8f4a1b" : "#0f6e73";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${color}"/><text x="32" y="42" font-family="system-ui,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${esc(initials)}</text></svg>`;
}

function renderRobots(data) {
  return `User-agent: *
Allow: /

Sitemap: ${data.urlBase}sitemap.xml
`;
}

function renderSitemap(data) {
  const today = new Date().toISOString().slice(0, 10);
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${data.urlBase}</loc><lastmod>${today}</lastmod></url>
  <url><loc>${data.urlBase}aviso-de-privacidad.html</loc><lastmod>${today}</lastmod></url>
</urlset>
`;
}

// ---------- build ----------
function build(jsonPath) {
  const abs = path.resolve(jsonPath);
  const data = JSON.parse(fs.readFileSync(abs, "utf8"));
  validate(data, jsonPath);

  const slug = path.basename(jsonPath, ".json");
  const outDir = path.join(ROOT, "docs", slug);
  const imagesOut = path.join(outDir, "images");
  fs.mkdirSync(imagesOut, { recursive: true });

  const prefix = IMAGE_PREFIX[data.giro];
  fs.copyFileSync(path.join(TEMPLATES, "images", `${prefix}-hero.jpg`), path.join(imagesOut, "hero.jpg"));
  fs.copyFileSync(path.join(TEMPLATES, "images", `${prefix}-about.jpg`), path.join(imagesOut, "about.jpg"));
  fs.copyFileSync(path.join(TEMPLATES, "images", `${prefix}-og.jpg`), path.join(imagesOut, "og-image.jpg"));

  fs.copyFileSync(path.join(TEMPLATES, "script.js"), path.join(outDir, "script.js"));

  const base = fs.readFileSync(path.join(TEMPLATES, "base.css"), "utf8");
  const preset = fs.readFileSync(path.join(TEMPLATES, "presets", `${data.estilo}.css`), "utf8");
  const accentOverride = data.colorAcento ? `\n:root { --color-accent-2: ${data.colorAcento}; }\n` : "";
  fs.writeFileSync(path.join(outDir, "style.css"), `${base}\n${preset}${accentOverride}`);

  fs.writeFileSync(path.join(outDir, "index.html"), renderIndex(data));
  fs.writeFileSync(path.join(outDir, "aviso-de-privacidad.html"), renderAvisoPrivacidad(data));
  fs.writeFileSync(path.join(outDir, "favicon.svg"), renderFavicon(data));
  fs.writeFileSync(path.join(outDir, "robots.txt"), renderRobots(data));
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), renderSitemap(data));

  console.log(`OK: ${jsonPath} -> docs/${slug}/ (${data.demo ? "demo, noindex" : "indexable"})`);
}

const arg = process.argv[2];
if (!arg) {
  console.error("Uso: node build.js clientes/<slug>.json");
  process.exit(1);
}
try {
  build(arg);
} catch (err) {
  console.error(`ERROR: ${err.message}`);
  process.exit(1);
}
