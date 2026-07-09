document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  if (document.querySelector('[data-family-page]')) {
    renderFamilyPage();
  }
  if (document.querySelector('[data-dashboard-page]')) {
    renderDashboard();
  }
});

let familyPageState = {
  family: null,
  controls: []
};

function getStatusFromPercent(percent) {
  const value = Number(percent) || 0;

  if (value >= 81) return 'green';
  if (value >= 71) return 'yellow';
  if (value >= 51) return 'orange';
  return 'red';
}

function renderDashboard() {
  const grid = document.getElementById('familyGrid');
  if (!grid) return;

  fetchJSON('/api/families')
    .then(payload => {
      const families = Array.isArray(payload.families) ? payload.families : [];
      grid.innerHTML = '';

console.log(families[0]);

      families.forEach(family => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'control-card';

        card.dataset.status = getStatusFromPercent(family.completion_percent);

        card.addEventListener('click', () => {
          window.location.href = `/family.html?family=${encodeURIComponent(family.code)}`;
        });

        card.innerHTML = `
          <div class="control-id">${family.name}</div>
          <div class="control-title">
            <span class="family-card-code">${family.code}</span>
            <span class="family-card-controls">${family.control_count} controls</span>
          </div>
        `;

        grid.appendChild(card);
      });

      if (!families.length) {
        grid.innerHTML = '<p>No control families found.</p>';
      }
    })
    .catch(error => {
      grid.innerHTML = '<p>Unable to load family list.</p>';
      console.error('Failed to render dashboard', error);
    });
}



function applyMetricStatus(cardEl, percent) {
  if (!cardEl) return;
  cardEl.dataset.status = getMetricStatus(percent);
}

function highlightNav() {
  const current = window.location.pathname.split('/').pop() || 'dashboard.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href.includes(current)) link.classList.add('active');
  });
}

async function fetchJSON(path) {
  const res = await fetch(path, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Failed to load ${path}`);
  return res.json();
}

async function renderFamilyPage() {
  const params = new URLSearchParams(window.location.search);
  const familyCode = params.get('family') || 'AC';

  try {
    const payload = await loadFamilyPayload(familyCode);
    familyPageState.family = payload.family;
    familyPageState.controls = payload.controls || [];

    renderFamilyHeader(payload.family);
    setupFamilyEditPanel(payload)
    renderFamilyKpis(payload);
    renderControls(payload.controls);
    setupFamilyEditPanel(payload);
  } catch (error) {
    renderFamilyError(error);
  }
}

async function loadFamilyPayload(familyCode) {
  const apiPath = `/api/families/${encodeURIComponent(familyCode)}`;
  try {
    return await fetchJSON(apiPath);
  } catch (apiError) {
    const fallbackPath = `./data/family-${familyCode.toLowerCase()}.json`;
    return fetchJSON(fallbackPath);
  }
}

function renderFamilyHeader(family) {
  document.querySelector('[data-family-code]').textContent = family.code || 'Family';
  document.querySelector('[data-family-title]').textContent = family.name || 'Control family';
  document.querySelector('[data-family-summary]').textContent = family.summary || 'Detailed control status, guidance, and evidence.';
}


function setupFamilyEditPanel(payload) {
const panel = document.getElementById('familyEditPanel');
  console.log('setupFamilyEditPanel: start');

  const toggle = document.getElementById('editFamilyToggle');
  
  const cancel = document.getElementById('cancelFamilyEdit');
  const form = document.getElementById('familyEditForm');
  const controlSelect = document.getElementById('editControlSelect');
  const statusSelect = document.getElementById('editStatusSelect');
  const notes = document.getElementById('editImplementationNotes');

  console.log('setupFamilyEditPanel elements:', {
    toggle,
    panel,
    cancel,
    form,
    controlSelect,
    statusSelect,
    notes
  });

  if (!toggle || !panel || !cancel || !form || !controlSelect) {
    console.log('setupFamilyEditPanel: one or more required elements not found');
    return;
  }

  controlSelect.innerHTML = `
    <option value="">Choose a control</option>
    ${payload.controls.map(control => `
      <option value="${escapeAttribute(control.id)}">
        ${escapeHtml(control.id)} — ${escapeHtml(control.title || 'Untitled control')}
      </option>
    `).join('')}
  `;

  toggle.addEventListener('click', (event) => {
    console.log('setupFamilyEditPanel: click fired', event.currentTarget);

    const open = !panel.hasAttribute('hidden');

    if (open) {
      panel.setAttribute('hidden', '');
      toggle.setAttribute('aria-expanded', 'false');
    } else {
      panel.removeAttribute('hidden');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });

  console.log('setupFamilyEditPanel: listener attached');
}

  cancel.addEventListener('click', () => {
    form.reset();
    panel.setAttribute('hidden', '');
    toggle.setAttribute('aria-expanded', 'false');
  });

  controlSelect.addEventListener('change', () => {
    const selected = payload.controls.find(control => String(control.id) === controlSelect.value);
    if (!selected) return;

    statusSelect.value = normalizeStatus(selected.status || 'not_started');
    notes.value = selected.implementation_notes || '';
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    const formData = new FormData(form);

    console.log({
      controlId: formData.get('controlId'),
      status: formData.get('status'),
      guideFile: formData.get('guideFile'),
      evidenceCount: document.getElementById('editEvidenceFile')?.files.length || 0,
      implementationNotes: formData.get('implementationNotes')
    });
  });




function renderFamilyKpis(payload) {
  const controls = Array.isArray(payload.controls) ? payload.controls : [];
  const implemented = controls.filter(control => normalizeStatus(control.status) === 'implemented').length;

  const hasGuide = controls.some(control => control.guide);
  const hasEvidence = controls.some(control => Array.isArray(control.artifacts) && control.artifacts.length > 0);

  const completion = Number(payload.family?.completion_percent) || 0;
  const familyStatus = getStatusFromPercent(completion);

  document.querySelector('[data-kpi-controls]').textContent = String(controls.length);
  document.querySelector('[data-kpi-implemented]').textContent = String(implemented);
  document.querySelector('[data-kpi-guides]').textContent = hasGuide ? 'Yes' : 'No';
  document.querySelector('[data-kpi-artifacts]').textContent = hasEvidence ? 'Yes' : 'No';

  document.querySelector('[data-kpi-guides-card]')?.setAttribute('data-presence', hasGuide ? 'yes' : 'no');
  document.querySelector('[data-kpi-evidence-card]')?.setAttribute('data-presence', hasEvidence ? 'yes' : 'no');

  const familyStatusCard = document.getElementById('familyStatusCard');
  const familyStatusLabel = document.getElementById('familyStatusLabel');

  if (familyStatusCard) {
    familyStatusCard.dataset.status = familyStatus;
  }

  if (familyStatusLabel) {
    familyStatusLabel.textContent = `${completion}% complete`;
  }
}








function renderControls(controls) {
  const container = document.querySelector('[data-controls-container]');
  const template = document.getElementById('control-card-template');
  container.innerHTML = '';

  if (!controls.length) {
    container.innerHTML = `
      <article class="panel empty-state-panel">
        <div>
          <h2 class="panel-title">No controls found</h2>
          <p class="panel-sub">The selected family does not currently include control detail data.</p>
        </div>
      </article>`;
    return;
  }

  controls.forEach(control => {
    const node = template.content.cloneNode(true);
    populateControlCard(node, control);
    container.appendChild(node);
  });
}

function populateControlCard(fragment, control) {
  setText(fragment, '[data-control-id]', control.id || 'Control');
  setText(fragment, '[data-control-title]', control.title || 'Untitled control');
  setText(fragment, '[data-control-description]', control.description || 'No control description available.');
  setText(fragment, '[data-control-owner]', control.owner || 'Unassigned');
  setText(fragment, '[data-control-reviewed]', formatDate(control.lastReviewed));
  setText(fragment, '[data-control-artifact-count]', String((control.artifacts || []).length));

  const statusEl = fragment.querySelector('[data-control-status]');
  const statusKey = normalizeStatus(control.status);
  statusEl.textContent = labelizeStatus(control.status || 'not_started');
  statusEl.classList.add(`status-${statusKey}`);

  const evidenceEl = fragment.querySelector('[data-control-evidence]');
  evidenceEl.textContent = `${(control.artifacts || []).length} artifact${(control.artifacts || []).length === 1 ? '' : 's'}`;

  applyGuide(fragment, control.guide || null);
  renderArtifacts(fragment.querySelector('[data-artifact-list]'), control.artifacts || []);
}

function applyGuide(fragment, guide) {
  const guideState = fragment.querySelector('[data-guide-state]');
  const statusBadge = fragment.querySelector('[data-guide-status-badge]');
  const empty = fragment.querySelector('[data-guide-empty]');
  const content = fragment.querySelector('[data-guide-content]');
  const fileEmpty = fragment.querySelector('[data-guide-file-empty]');
  const fileRow = fragment.querySelector('[data-guide-file]');

  if (!guide) {
    guideState.textContent = 'None';
    statusBadge.textContent = 'Not published';
    statusBadge.classList.add('guide-none');
    return;
  }

  const guideStatus = guide.status || 'draft';
  const guideClass = `guide-${normalizeStatus(guideStatus)}`;
  guideState.textContent = labelizeStatus(guideStatus);
  statusBadge.textContent = labelizeStatus(guideStatus);
  statusBadge.classList.add(guideClass);

  setText(fragment, '[data-guide-title]', guide.title || 'Untitled guide');
  setText(fragment, '[data-guide-summary]', guide.summary || '');
  setText(fragment, '[data-guide-version]', `Version ${guide.version || 1}`);

  const body = fragment.querySelector('[data-guide-body]');
  body.innerHTML = renderRichText(guide.howToMarkdown || guide.how_to_markdown || guide.body || '');

  empty.hidden = false;
  content.hidden = true;
  if ((guide.howToMarkdown || guide.how_to_markdown || guide.body || '').trim()) {
    empty.hidden = true;
    content.hidden = false;
  }

  const pdf = guide.pdf || guide.pdfArtifact || null;
  if (pdf && (pdf.url || pdf.downloadUrl || pdf.storageKey || pdf.fileName)) {
    fileEmpty.hidden = true;
    fileRow.hidden = false;
    setText(fragment, '[data-guide-file-name]', pdf.displayName || pdf.fileName || 'Guide PDF');
    setText(fragment, '[data-guide-file-meta]', [pdf.mimeType || 'PDF', pdf.updatedAt ? formatDate(pdf.updatedAt) : ''].filter(Boolean).join(' · '));
    const link = fragment.querySelector('[data-guide-download]');
    link.href = pdf.downloadUrl || pdf.url || `/api/artifacts/${encodeURIComponent(pdf.id || '')}/download`;
  }
}

function renderArtifacts(container, artifacts) {
  if (!artifacts.length) {
    container.innerHTML = '<div class="artifact-empty">No supporting artifacts have been uploaded for this control yet.</div>';
    return;
  }

  container.innerHTML = artifacts.map(item => {
    const fileUrl = item.downloadUrl || item.url || '#';
    const meta = [item.type || item.artifactRole || 'Artifact', item.updatedAt ? formatDate(item.updatedAt) : '', item.owner || ''].filter(Boolean).join(' · ');
    return `
      <div class="artifact-item">
        <div class="artifact-copy">
          <strong>${escapeHtml(item.displayName || item.fileName || 'Unnamed artifact')}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
        <a class="btn btn-outline btn-small" href="${escapeAttribute(fileUrl)}" ${fileUrl === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}>Open</a>
      </div>`;
  }).join('');
}

function renderFamilyError(error) {
  const container = document.querySelector('[data-controls-container]');
  container.innerHTML = `
    <article class="panel empty-state-panel">
      <div>
        <h2 class="panel-title">Unable to load family data</h2>
        <p class="panel-sub">${escapeHtml(error.message || 'Unknown error')}</p>
      </div>
    </article>`;
}

function renderRichText(markdown) {
  if (!markdown) return '';
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/```([\s\S]*?)```/g, (_, code) => `<pre><code>${code.trim()}</code></pre>`)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/^\- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .split(/\n\n+/)
    .map(block => {
      if (/^<h\d|^<pre|^<ul>/.test(block)) return block;
      return `<p>${block.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');
}

function normalizeStatus(status) {
  return String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
}

function labelizeStatus(status) {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase()) || 'Unknown';
}

function formatDate(value) {
  if (!value) return 'Not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
}

function setText(root, selector, value) {
  const el = root.querySelector(selector);
  if (el) el.textContent = value;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  if (document.querySelector('[data-family-page]')) {
    renderFamilyPage();
  }
  if (document.querySelector('[data-dashboard-page]')) {
    renderDashboard();
  }
});