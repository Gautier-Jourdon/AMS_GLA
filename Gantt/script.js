const START = '2025-10-20';
const END = '2026-01-08';

const BREAKS = [
  {
    label: 'Noël (activité réduite)\n24–26 décembre',
    start: '2025-12-24',
    end: '2025-12-26'
  },
  {
    label: 'Nouvel An (activité réduite)\n31 déc – 1 jan',
    start: '2025-12-31',
    end: '2026-01-01'
  }
];

const TASKS = [
  {
    name: 'Cadrage & backlog initial',
    start: '2025-10-20',
    end: '2025-10-31',
    desc: "Cadrage, cahier des charges, backlog et priorisation initiale (Kanban)."
  },
  {
    name: 'Sprint 00 — Collecte CoinCap + collecteur',
    start: '2025-11-01',
    end: '2025-11-15',
    desc: "API CoinCap, assets, fetcher, collecteur, premières données."
  },
  {
    name: 'Fiabilisation collecte & logs',
    start: '2025-11-10',
    end: '2025-11-20',
    desc: "Structuration des logs et renforcement de la robustesse (erreurs API, sorties)."
  },
  {
    name: 'Sprint 01 — Docker + Kubernetes (base)',
    start: '2025-11-16',
    end: '2025-11-30',
    desc: "Mise en place Docker / manifests Kubernetes / déploiement initial."
  },
  {
    name: 'Sprint 02 — CI/CD + runner self-hosted',
    start: '2025-11-22',
    end: '2025-11-30',
    desc: "GitHub Actions, itérations sur ci.yaml, CD Kubernetes, runner self-hosted."
  },
  {
    name: 'Sprint 03 — WebUI (base dashboard)',
    start: '2025-12-01',
    end: '2025-12-10',
    desc: "Interface WebUI de base, structure du dashboard, premières animations."
  },
  {
    name: 'Docs & revue projet',
    start: '2025-12-01',
    end: '2025-12-05',
    desc: "Mise à jour documentation, revue d’informations projet, Kanban."
  },
  {
    name: 'Sprint 04 — Fiabilisation backend & Auth fallback',
    start: '2025-12-11',
    end: '2025-12-22',
    desc: "Fix critiques 401/500, fallback DB locale, stabilisation des endpoints."
  },
  {
    name: 'Campagne de tests (unitaires + intégration + couverture)',
    start: '2025-12-15',
    end: '2025-12-30',
    desc: "Jest + Supertest + jsdom : scénarios d’erreurs, branches/coverage, non-régression."
  },
  {
    name: 'Pic corrections serveur & montée coverage',
    start: '2025-12-26',
    end: '2025-12-28',
    desc: "Corrections serveur, montée en couverture, stabilisation en fin de période."
  },
  {
    name: 'Sprint 05 — UI/UX (ergonomie)',
    start: '2025-12-28',
    end: '2025-12-31',
    desc: "Améliorations UX des panels, états de chargement, ergonomie générale."
  },
  {
    name: 'Wallet virtuel + DB/alertes',
    start: '2025-12-30',
    end: '2026-01-02',
    desc: "Mise en place wallet et améliorations DB/alertes."
  },
  {
    name: 'Consolidation finale (auth + base + K8s/frontend)',
    start: '2026-01-02',
    end: '2026-01-08',
    desc: "Intégration finale, mise à jour globale, stabilisation et livraison."
  },
  {
    name: 'Jalon : rendu / aujourd’hui',
    milestone: true,
    at: '2026-01-08',
    desc: "Jalon de livraison (date de référence : 8 janvier 2026)."
  }
];

function parseISO(d) {
  // Force UTC to avoid DST issues when computing day differences
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day));
}

function fmtFR(d) {
  const dt = parseISO(d);
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(dt.getUTCFullYear());
  return `${dd}/${mm}/${yy}`;
}

function daysBetweenInclusive(a, b) {
  const ms = parseISO(b) - parseISO(a);
  return Math.floor(ms / 86400000) + 1;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function addDaysISO(iso, days) {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function isoToDayIndex(iso) {
  const start = parseISO(START);
  const d = parseISO(iso);
  return Math.floor((d - start) / 86400000);
}

function isWeekendISO(iso) {
  const d = parseISO(iso);
  const dow = d.getUTCDay();
  return dow === 0 || dow === 6;
}

function monthLabelFR(monthIndex) {
  // monthIndex: 0..11
  const names = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return names[monthIndex] || '';
}

function buildMonthSegments(startISO, endISO) {
  const segments = [];
  const start = parseISO(startISO);
  const end = parseISO(endISO);

  let cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  // Move cursor to month of START
  cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1));

  while (cursor <= end) {
    const y = cursor.getUTCFullYear();
    const m = cursor.getUTCMonth();

    const monthStart = new Date(Date.UTC(y, m, 1));
    const monthEnd = new Date(Date.UTC(y, m + 1, 0)); // last day of month

    const segStart = monthStart < start ? start : monthStart;
    const segEnd = monthEnd > end ? end : monthEnd;

    const startISO2 = `${segStart.getUTCFullYear()}-${String(segStart.getUTCMonth() + 1).padStart(2, '0')}-${String(segStart.getUTCDate()).padStart(2, '0')}`;
    const endISO2 = `${segEnd.getUTCFullYear()}-${String(segEnd.getUTCMonth() + 1).padStart(2, '0')}-${String(segEnd.getUTCDate()).padStart(2, '0')}`;

    segments.push({
      year: y,
      month: m,
      label: `${monthLabelFR(m)} ${y}`,
      start: startISO2,
      end: endISO2,
      days: daysBetweenInclusive(startISO2, endISO2)
    });

    cursor = new Date(Date.UTC(y, m + 1, 1));
  }

  return segments;
}

function setCssVar(name, value) {
  document.documentElement.style.setProperty(name, value);
}

function init() {
  const totalDays = daysBetweenInclusive(START, END);
  const months = buildMonthSegments(START, END);

  // DOM refs
  const monthsHeader = document.getElementById('monthsHeader');
  const daysHeader = document.getElementById('daysHeader');
  const background = document.getElementById('background');
  const bars = document.getElementById('bars');
  const taskList = document.getElementById('taskList');
  const ganttRight = document.getElementById('ganttRight');
  const timeline = document.getElementById('timeline');
  const todayLine = document.getElementById('todayLine');
  const tooltip = document.getElementById('tooltip');

  const zoom = document.getElementById('zoom');
  const zoomValue = document.getElementById('zoomValue');
  const scrollTodayBtn = document.getElementById('scrollToday');
  const scrollStartBtn = document.getElementById('scrollStart');

  function applyZoom(pxPerDay) {
    setCssVar('--day-w', `${pxPerDay}px`);
    zoomValue.textContent = `${pxPerDay} px/jour`;

    // update grids
    monthsHeader.style.gridTemplateColumns = `repeat(${totalDays}, var(--day-w))`;
    daysHeader.style.gridTemplateColumns = `repeat(${totalDays}, var(--day-w))`;

    // widths for scrollable area
    const timelineWidth = totalDays * pxPerDay;
    timeline.style.minWidth = `${timelineWidth}px`;

    // background grid columns
    background.style.minWidth = `${timelineWidth}px`;
    bars.style.minWidth = `${timelineWidth}px`;

    // reposition today line
    positionTodayLine();
  }

  // Months header (Oct–Jan only by construction)
  monthsHeader.style.gridTemplateColumns = `repeat(${totalDays}, var(--day-w))`;
  monthsHeader.innerHTML = '';
  let dayCursor = 0;
  for (const seg of months) {
    const el = document.createElement('div');
    el.className = 'month';
    el.style.gridColumn = `${dayCursor + 1} / span ${seg.days}`;
    el.textContent = seg.label;
    monthsHeader.appendChild(el);
    dayCursor += seg.days;
  }

  // Days header
  daysHeader.style.gridTemplateColumns = `repeat(${totalDays}, var(--day-w))`;
  daysHeader.innerHTML = '';
  for (let i = 0; i < totalDays; i++) {
    const iso = addDaysISO(START, i);
    const d = parseISO(iso);
    const dayNum = d.getUTCDate();
    const el = document.createElement('div');
    el.className = 'day' + (isWeekendISO(iso) ? ' weekend' : '');
    // show only day numbers to keep it readable
    el.textContent = String(dayNum);
    daysHeader.appendChild(el);
  }

  // Left task list + right rows
  const renderTasks = TASKS.filter(t => !t.milestone);
  taskList.innerHTML = '';
  bars.innerHTML = '';

  for (const t of renderTasks) {
    const name = document.createElement('div');
    name.className = 'task-name';
    name.innerHTML = `${escapeHtml(t.name)} <small class="mono">${fmtFR(t.start)} → ${fmtFR(t.end)}</small>`;
    taskList.appendChild(name);

    const row = document.createElement('div');
    row.className = 'row';
    row.dataset.task = t.name;
    bars.appendChild(row);
  }

  // Background: day columns (with weekend shading)
  background.innerHTML = '';
  for (let i = 0; i < totalDays; i++) {
    const iso = addDaysISO(START, i);
    const col = document.createElement('div');
    col.className = 'bg-grid' + (isWeekendISO(iso) ? ' weekend' : '');
    col.style.left = `calc(${i} * var(--day-w))`;
    col.style.width = `var(--day-w)`;
    background.appendChild(col);
  }

  // Background: breaks (Noël + Nouvel An)
  for (const br of BREAKS) {
    const startIdx = clamp(isoToDayIndex(br.start), 0, totalDays - 1);
    const endIdx = clamp(isoToDayIndex(br.end), 0, totalDays - 1);
    const range = document.createElement('div');
    range.className = 'bg-range';
    range.style.left = `calc(${startIdx} * var(--day-w))`;
    range.style.width = `calc(${endIdx - startIdx + 1} * var(--day-w))`;
    range.title = br.label;
    background.appendChild(range);
  }

  // Bars
  const rows = Array.from(bars.querySelectorAll('.row'));
  rows.forEach((row, idx) => {
    const t = renderTasks[idx];
    const startIdx = clamp(isoToDayIndex(t.start), 0, totalDays - 1);
    const endIdx = clamp(isoToDayIndex(t.end), 0, totalDays - 1);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = `calc(${startIdx} * var(--day-w) + 2px)`;
    bar.style.width = `calc(${endIdx - startIdx + 1} * var(--day-w) - 4px)`;

    const durationDays = endIdx - startIdx + 1;
    const title = t.name;
    const dates = `${fmtFR(t.start)} → ${fmtFR(t.end)} (${durationDays} jour${durationDays > 1 ? 's' : ''})`;

    bar.dataset.title = title;
    bar.dataset.dates = dates;
    bar.dataset.desc = t.desc || '';

    bindTooltip(bar, tooltip);

    row.appendChild(bar);
  });

  // Milestones
  const milestone = TASKS.find(t => t.milestone);
  if (milestone) {
    const atIdx = clamp(isoToDayIndex(milestone.at), 0, totalDays - 1);
    // attach milestone into last row for visibility
    const lastRow = rows[rows.length - 1];
    if (lastRow) {
      const m = document.createElement('div');
      m.className = 'bar milestone';
      m.style.left = `calc(${atIdx} * var(--day-w) - 6px)`;
      m.dataset.title = milestone.name;
      m.dataset.dates = `${fmtFR(milestone.at)}`;
      m.dataset.desc = milestone.desc || '';
      bindTooltip(m, tooltip);
      lastRow.appendChild(m);
    }
  }

  // Today line
  function positionTodayLine() {
    const todayLocal = new Date();
    const todayISO = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    const idx = isoToDayIndex(todayISO);

    if (idx < 0 || idx >= totalDays) {
      todayLine.style.display = 'none';
      return;
    }

    todayLine.style.display = 'block';
    todayLine.style.left = `calc(${idx} * var(--day-w))`;
  }

  // Expose for zoom updates
  window.__positionTodayLine = positionTodayLine;

  // Zoom controls
  zoom.addEventListener('input', () => {
    const px = Number(zoom.value);
    applyZoom(px);
  });

  scrollStartBtn.addEventListener('click', () => {
    ganttRight.scrollTo({ left: 0, behavior: 'smooth' });
  });

  scrollTodayBtn.addEventListener('click', () => {
    const todayLocal = new Date();
    const todayISO = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;
    const idx = clamp(isoToDayIndex(todayISO), 0, totalDays - 1);
    const px = Number(zoom.value);
    const target = idx * px - 240;
    ganttRight.scrollTo({ left: Math.max(0, target), behavior: 'smooth' });
  });

  // initial zoom
  applyZoom(Number(zoom.value));

  // on resize, keep today line correct
  window.addEventListener('resize', () => positionTodayLine());
}

function bindTooltip(el, tooltip) {
  const show = (ev) => {
    const title = el.dataset.title || '';
    const dates = el.dataset.dates || '';
    const desc = el.dataset.desc || '';

    tooltip.innerHTML = `
      <div class="t-title">${escapeHtml(title)}</div>
      <div class="t-line mono">${escapeHtml(dates)}</div>
      ${desc ? `<div class="t-line">${escapeHtml(desc)}</div>` : ''}
    `;

    tooltip.setAttribute('aria-hidden', 'false');
    positionTooltip(ev, tooltip);
  };

  const move = (ev) => positionTooltip(ev, tooltip);
  const hide = () => tooltip.setAttribute('aria-hidden', 'true');

  el.addEventListener('mouseenter', show);
  el.addEventListener('mousemove', move);
  el.addEventListener('mouseleave', hide);
  el.addEventListener('blur', hide);
}

function positionTooltip(ev, tooltip) {
  const pad = 14;
  const rect = tooltip.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let x = ev.clientX + 14;
  let y = ev.clientY + 14;

  if (x + rect.width + pad > vw) x = ev.clientX - rect.width - 14;
  if (y + rect.height + pad > vh) y = ev.clientY - rect.height - 14;

  tooltip.style.left = `${Math.max(pad, x)}px`;
  tooltip.style.top = `${Math.max(pad, y)}px`;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

init();
