async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  return response.json();
}

(function initTheme() {
  const toggle = document.querySelector('[data-theme-toggle]');
  let current = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', current);
  if (toggle) {
    toggle.addEventListener('click', () => {
      current = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', current);
    });
  }
})();

async function renderDashboard() {
  const grid = document.getElementById('familyGrid');
  if (!grid) return;

  const familyCount = document.getElementById('familyCount');
  const controlCount = document.getElementById('controlCount');
  const overallCompletion = document.getElementById('overallCompletion');
  const searchInput = document.getElementById('familySearch');

  grid.innerHTML = '<p>Loading families...</p>';

  try {
    const payload = await fetchJson('/api/families');
    const families = payload.families ?? [];

    familyCount.textContent = String(families.length);
    controlCount.textContent = String(families.reduce((sum, item) => sum + Number(item.control_count || 0), 0));

    const overall = families.length
      ? Math.round(families.reduce((sum, item) => sum + Number(item.completion_percent || 0), 0) / families.length)
      : 0;
    overallCompletion.textContent = `${overall}%`;

    const paint = (term = '') => {
      const filtered = families.filter(item => {
        const haystack = `${item.code} ${item.name} ${item.status}`.toLowerCase();
        return haystack.includes(term.toLowerCase());
      });

      if (!filtered.length) {
        grid.innerHTML = '<p>No families match the current filter.</p>';
        return;
      }

      grid.innerHTML = filtered.map(item => {
        const pct = Number(item.completion_percent || 0);
        return `
          <article class="family-card">
            <div>
              <p class="eyebrow">${item.code}</p>
              <h4>${item.name}</h4>
            </div>
            <span class="status-pill">${item.status}</span>
            <div class="progress-track" aria-hidden="true">
              <div class="progress-bar" style="width:${pct}%"></div>
            </div>
            <div class="family-meta">${pct}% complete · ${Number(item.control_count || 0)} controls</div>
            <a class="button secondary" href="./family.html?family=${encodeURIComponent(item.code)}">Open family</a>
          </article>
        `;
      }).join('');
    };

    paint();
    searchInput?.addEventListener('input', event => paint(event.target.value));
  } catch (error) {
    grid.innerHTML = '<p>Unable to load families from the API.</p>';
    console.error(error);
  }
}

async function renderFamily() {
  const title = document.getElementById('familyTitle');
  const tableWrap = document.getElementById('controlsTable');
  const controlSelect = document.getElementById('controlSelect');
  const form = document.getElementById('artifactForm');
  const status = document.getElementById('artifactStatus');
  if (!title || !tableWrap || !controlSelect || !form || !status) return;

  const familyCode = new URLSearchParams(window.location.search).get('family') || 'AC';
  tableWrap.innerHTML = '<p>Loading controls...</p>';

  try {
    const payload = await fetchJson(`/api/families/${encodeURIComponent(familyCode)}`);
    const family = payload.family;
    const controls = payload.controls ?? [];

    title.textContent = `${family.name} (${family.code})`;

    if (!controls.length) {
      tableWrap.innerHTML = '<p>No controls found for this family.</p>';
      controlSelect.innerHTML = '<option value="">No controls available</option>';
    } else {
      tableWrap.innerHTML = `
        <table>
          <thead>
            <tr>
              <th>Control</th>
              <th>Title</th>
              <th>Status</th>
              <th>Implementation notes</th>
              <th>Assessor notes</th>
            </tr>
          </thead>
          <tbody>
            ${controls.map(control => `
              <tr>
                <td>${control.control_id}</td>
                <td>${control.title}</td>
                <td>${control.status}</td>
                <td>${control.implementation_notes || ''}</td>
                <td>${control.assessor_notes || ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      controlSelect.innerHTML = controls.map(control => `
        <option value="${control.control_id}">${control.control_id} — ${control.title}</option>
      `).join('');
    }

    form.addEventListener('submit', async event => {
      event.preventDefault();
      const formData = new FormData(form);
      status.textContent = 'Submitting artifact metadata...';

      try {
        const response = await fetch('/api/artifacts/upload', {
          method: 'POST',
          body: formData
        });

        const payload = await response.json();
        status.textContent = payload.message || 'Upload endpoint responded.';
      } catch (error) {
        status.textContent = 'Upload endpoint is not yet connected to live storage.';
        console.error(error);
      }
    }, { once: true });
  } catch (error) {
    tableWrap.innerHTML = '<p>Unable to load family details from the API.</p>';
    controlSelect.innerHTML = '<option value="">Unable to load controls</option>';
    console.error(error);
  }
}

renderDashboard();
renderFamily();
