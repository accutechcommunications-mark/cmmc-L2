document.addEventListener('DOMContentLoaded', () => {
  highlightNav();
  if (document.querySelector('[data-family-page]')) {
    renderFamilyPage();
  }
});

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
    const rawPayload = await fetchJSON(`/api/families/${encodeURIComponent(familyCode)}`);
    const payload = normalizeFamilyPayload(rawPayload, familyCode);
    renderFamilyHeader(payload.family);
    renderFamilyKpis(payload);
    renderControls(payload.controls || []);
  } catch (error) {
    renderFamilyError(error);
  }
}

function normalizeFamilyPayload(payload, familyCode) {
  const family = payload.family || {};
  const normalizedControls = (payload.controls || []).map(control => normalizeControl(control, familyCode));

  return {
    family: {
      id: family.id || familyCode,
      code: family.code || familyCode,
      name: family.name || 'Control family',
      summary: family.summary || `${family.name || familyCode} control detail, implementation guidance, and evidence tracking.`,
      status: family.status || 'Not Started',
      completionPercent: family.completion_percent ?? family.completionPercent ?? calculateCompletion(normalizedControls)
    },
    controls: normalizedControls
  };
}

function normalizeControl(control, familyCode) {
  const artifacts = Array.isArray(control.artifacts) ? control.artifacts : [];
  const guide = normalizeGuide(control.guide || control.how_to || null);
  const description = control.description || control.implementation_notes || control.assessor_notes || 'No implementation notes have been added yet.';

  return {
    id: control.id || control.control_id || `${familyCode}-control`,
    title: control.title || 'Untitled control',
    description,
    status: control.status || 'Not Started',
    owner: control.owner || control.control_owner || 'Unassigned',
    lastReviewed: control.lastReviewed || control.last_reviewed_at || null,
    dueDate: control.dueDate || control.due_date || null,
    implementationNotes: control.implementation_notes || null,
    assessorNotes: control.assessor_notes || null,
    artifacts,
    guide
  };
}

function normalizeGuide(guide) {
  if (!guide) return null;

  const pdf = guide.pdf || guide.pdfArtifact || guide.pdf_artifact || null;
  return {
    title: guide.title || 'Control guide',
    summary: guide.summary || '',
    status: guide.status || 'draft',
    version: guide.version || 1,
    howToMarkdown: guide.howToMarkdown || guide.how_to_markdown || guide.body || '',
    pdf: pdf
      ? {
          id: pdf.id || null,
          displayName: pdf.displayName || pdf.display_name || pdf.fileName || pdf.file_name || 'Guide PDF',
          fileName: pdf.fileName || pdf.file_name || 'guide.pdf',
          mimeType: pdf.mimeType || pdf.mime_type || 'application/pdf',
          updatedAt: pdf.updatedAt || pdf.updated_at || null,
          downloadUrl: pdf.downloadUrl || pdf.download_url || (pdf.id ? `/api/artifacts/${encodeURIComponent(pdf.id)}/download` : '#'),
          url: pdf.url || null
        }
      : null
  };
}

function calculateCompletion(controls) {
  if (!controls.length) return 0;
  const completed = controls.filter(control => normalizeStatus(control.status) === 'implemented').length;
  return Math.round((completed / controls.length) * 100);
}

function renderFamilyHeader(family) {
  const codeEl = document.querySelector('[data-family-code]');
  const titleEl = document.querySelector('[data-family-title]');
  const summaryEl = document.querySelector('[data-family-summary]');
  if (codeEl) codeEl.textContent = family.code || 'Family';
  if (titleEl) titleEl.textContent = family.name || 'Control family';
  if (summaryEl) summaryEl.textContent = family.summary || 'Detailed control status, guidance, and evidence.';
}

function renderFamilyKpis(payload) {
  const controls = payload.controls || [];
  const implemented = controls.filter(control => normalizeStatus(control.status) === 'implemented').length;
  const guideCount = controls.filter(control => control.guide && normalizeStatus(control.guide.status) === 'published').length;
  const artifactCount = controls.reduce((count, control) => count + ((control.artifacts || []).length), 0);

  setNodeText('[data-kpi-controls]', String(controls.length));
  setNodeText('[data-kpi-implemented]', String(implemented));
  setNodeText('[data-kpi-guides]', String(guideCount));
  setNodeText('[data-kpi-artifacts]', String(artifactCount));
}

function renderControls(controls) {
  const container = document.querySelector('[data-controls-container]');
  const template = document.getElementById('control-card-template');
  if (!container || !template) return;
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
  if (statusEl) {
    statusEl.textContent = labelizeStatus(control.status || 'not_started');
    statusEl.classList.add(`status-${statusKey}`);
  }

  const evidenceEl = fragment.querySelector('[data-control-evidence]');
  if (evidenceEl) {
    evidenceEl.textContent = `${(control.artifacts || []).length} artifact${(control.artifacts || []).length === 1 ? '' : 's'}`;
  }

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
    if (guideState) guideState.textContent = 'None';
    if (statusBadge) {
      statusBadge.textContent = 'Not published';
      statusBadge.classList.add('guide-none');
    }
    return;
  }

  const guideStatus = guide.status || 'draft';
  const guideClass = `guide-${normalizeStatus(guideStatus)}`;
  if (guideState) guideState.textContent = labelizeStatus(guideStatus);
  if (statusBadge) {
    statusBadge.textContent = labelizeStatus(guideStatus);
    statusBadge.classList.add(guideClass);
  }

  setText(fragment, '[data-guide-title]', guide.title || 'Untitled guide');
  setText(fragment, '[data-guide-summary]', guide.summary || '');
  setText(fragment, '[data-guide-version]', `Version ${guide.version || 1}`);

  const body = fragment.querySelector('[data-guide-body]');
  if (body) body.innerHTML = renderRichText(guide.howToMarkdown || '');

  if (empty) empty.hidden = false;
  if (content) content.hidden = true;
  if ((guide.howToMarkdown || '').trim()) {
    if (empty) empty.hidden = true;
    if (content) content.hidden = false;
  }

  const pdf = guide.pdf || null;
  if (pdf && (pdf.url || pdf.downloadUrl || pdf.fileName)) {
    if (fileEmpty) fileEmpty.hidden = true;
    if (fileRow) fileRow.hidden = false;
    setText(fragment, '[data-guide-file-name]', pdf.displayName || pdf.fileName || 'Guide PDF');
    setText(fragment, '[data-guide-file-meta]', [pdf.mimeType || 'PDF', pdf.updatedAt ? formatDate(pdf.updatedAt) : ''].filter(Boolean).join(' · '));
    const link = fragment.querySelector('[data-guide-download]');
    if (link) {
      link.href = pdf.downloadUrl || pdf.url || '#';
    }
  }
}

function renderArtifacts(container, artifacts) {
  if (!container) return;

  if (!artifacts.length) {
    container.innerHTML = '<div class="artifact-empty">No supporting artifacts have been uploaded for this control yet.</div>';
    return;
  }

  container.innerHTML = artifacts.map(item => {
    const fileUrl = item.downloadUrl || item.download_url || item.url || '#';
    const meta = [item.type || item.artifactRole || item.artifact_role || 'Artifact', item.updatedAt ? formatDate(item.updatedAt) : (item.updated_at ? formatDate(item.updated_at) : ''), item.owner || ''].filter(Boolean).join(' · ');
    return `
      <div class="artifact-item">
        <div class="artifact-copy">
          <strong>${escapeHtml(item.displayName || item.display_name || item.fileName || item.file_name || 'Unnamed artifact')}</strong>
          <span>${escapeHtml(meta)}</span>
        </div>
        <a class="btn btn-outline btn-small" href="${escapeAttribute(fileUrl)}" ${fileUrl === '#' ? '' : 'target="_blank" rel="noopener noreferrer"'}>Open</a>
      </div>`;
  }).join('');
}

function renderFamilyError(error) {
  const container = document.querySelector('[data-controls-container]');
  if (!container) return;
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
  const value = String(status || '').trim().toLowerCase().replace(/\s+/g, '_');
  if (value === 'partially_met') return 'partially_met';
  if (value === 'ready_for_review') return 'ready_for_review';
  if (value === 'implemented') return 'implemented';
  if (value === 'in_progress') return 'in_progress';
  if (value === 'published') return 'published';
  if (value === 'draft') return 'draft';
  if (value === 'archived') return 'archived';
  return value || 'not_started';
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

function setNodeText(selector, value) {
  const el = document.querySelector(selector);
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
