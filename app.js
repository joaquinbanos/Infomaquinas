// INFOMAQUINAS — tabla por años (0km + últimos 20)
// Filtros con selects dependientes: Marca • Modelo • Versión

const state = {
  data: { items: [], updatedAt: null, currency: 'USD' },
  category: 'Sembradoras',
  filters: { brand: '', model: '', version: '' },
};

const els = {
  tabs: () => document.querySelectorAll('.tab'),
  brandSelect: document.getElementById('brandSelect'),
  modelSelect: document.getElementById('modelSelect'),
  versionSelect: document.getElementById('versionSelect'),
  tableBody: document.querySelector('#results tbody'),
  empty: document.getElementById('emptyState'),
  updatedAt: document.getElementById('updatedAt'),
  headerRow: document.getElementById('headerRow'),
};

async function loadData() {
  try {
    const res = await fetch('data/prices.json', { cache: 'no-store' });
    const json = await res.json();
    state.data = json;
    els.updatedAt.textContent = `Actualizado: ${json.updatedAt || '-'}`;
    refreshAll();
  } catch (e) {
    console.error('Error cargando datos', e);
    els.updatedAt.textContent = 'No se pudo cargar data/prices.json';
  }
}

function refreshAll() {
  buildBrandOptions();
  buildModelOptions();
  buildVersionOptions();
  renderHeader();
  render();
}

function inCategory() {
  return state.data.items.filter(i => i.category === state.category);
}

function buildBrandOptions() {
  const brands = [...new Set(inCategory().map(i => i.brand))].sort();
  fillSelect(els.brandSelect, ['Todas', ...brands], ['', ...brands], state.filters.brand);
}

function buildModelOptions() {
  const models = [...new Set(
    inCategory()
      .filter(i => (!state.filters.brand || i.brand === state.filters.brand))
      .map(i => i.model)
  )].sort();
  fillSelect(els.modelSelect, ['Todos', ...models], ['', ...models], state.filters.model);
}

function buildVersionOptions() {
  const versions = [...new Set(
    inCategory().filter(i =>
      (!state.filters.brand || i.brand === state.filters.brand) &&
      (!state.filters.model || i.model === state.filters.model)
    ).map(i => i.version || '')
  )].filter(Boolean).sort();
  fillSelect(els.versionSelect, ['Todas', ...versions], ['', ...versions], state.filters.version);
}

function fillSelect(selectEl, labels, values, selectedVal) {
  const opts = labels.map((label, idx) => {
    const val = String(values[idx]);
    const sel = selectedVal !== undefined && String(selectedVal) === val ? ' selected' : '';
    return `<option value="${val}"${sel}>${label}</option>`;
  }).join('');
  selectEl.innerHTML = opts;
  // Mejora visual: dropdown moderno y redondo
  enhanceSelect(selectEl);
}

function applyFilters(items) {
  return items.filter((i) => {
    if (i.category !== state.category) return false;
    if (state.filters.brand && i.brand !== state.filters.brand) return false;
    if (state.filters.model && i.model !== state.filters.model) return false;
    if (state.filters.version && (i.version || '') !== state.filters.version) return false;
    return true;
  });
}

function getColumns() {
  const cols = ['0km'];
  const now = new Date().getFullYear();
  for (let y = now - 1; y >= now - 20; y--) cols.push(String(y));
  return cols;
}

function formatUSD(n) {
  // Mostrar sin símbolo de moneda y con puntos como separador de miles
  if (n === undefined || n === null || n === '') return '-';
  const v = Number(n);
  if (Number.isNaN(v)) return '-';
  return new Intl.NumberFormat('es-ES', {
    useGrouping: true,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);
}

function renderHeader() {
  const cols = getColumns();
  const base = ['Marca', 'Modelo', 'Versión'];
  els.headerRow.innerHTML = [
    ...base.map(h => `<th>${h}</th>`),
    ...cols.map(h => `<th class="right">${h}</th>`)
  ].join('');
}

function render() {
  const items = applyFilters(state.data.items);
  const cols = getColumns();
  const byBrand = groupBy(items, i => i.brand);
  let html = '';
  Object.keys(byBrand).sort().forEach(brand => {
    const itemsBrand = byBrand[brand];
    html += `<tr class="group-brand"><td colspan="${3 + cols.length}">${brand}</td></tr>`;
    itemsBrand.sort((a,b)=> a.model.localeCompare(b.model)).forEach(row => {
      const cells = cols.map(c => formatUSD(row.prices?.[c]));
      html += `<tr>
        <td>${row.brand}</td>
        <td>${row.model}</td>
        <td>${row.version || '-'}</td>
        ${cells.map(v => `<td class="right">${v}</td>`).join('')}
      </tr>`;
    });
  });
  els.tableBody.innerHTML = html;
  els.empty.hidden = items.length !== 0;
}

function groupBy(arr, getKey) {
  return arr.reduce((acc, it) => {
    const k = getKey(it);
    (acc[k] ||= []).push(it);
    return acc;
  }, {});
}

function wire() {
  // Tabs
  els.tabs().forEach(btn => {
    btn.addEventListener('click', () => {
      els.tabs().forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.category;
      state.filters = { brand: '', model: '', version: '' };
      refreshAll();
    });
  });

  // Selects
  els.brandSelect.addEventListener('change', (e) => {
    state.filters.brand = e.target.value;
    state.filters.model = '';
    state.filters.version = '';
    buildModelOptions();
    buildVersionOptions();
    render();
  });
  els.modelSelect.addEventListener('change', (e) => {
    state.filters.model = e.target.value;
    state.filters.version = '';
    buildVersionOptions();
    render();
  });
  els.versionSelect.addEventListener('change', (e) => {
    state.filters.version = e.target.value;
    render();
  });

  // Importación manual deshabilitada (UI removida)
}

wire();
loadData();

// ---------------- UI personalizada para selects (moderno) ----------------
let openCustomSelect = null;
document.addEventListener('click', () => {
  if (openCustomSelect) {
    openCustomSelect.classList.remove('open');
    openCustomSelect = null;
  }
});

function enhanceSelect(selectEl) {
  // Evitar duplicados si ya fue mejorado
  if (selectEl.nextElementSibling && selectEl.nextElementSibling.classList?.contains('custom-select')) {
    selectEl.nextElementSibling.remove();
  }
  // Oculta el select nativo
  selectEl.classList.add('select-hidden');

  const wrap = document.createElement('div');
  wrap.className = 'custom-select';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'custom-select__button';
  btn.setAttribute('aria-haspopup', 'listbox');

  const list = document.createElement('div');
  list.className = 'custom-select__options';
  list.setAttribute('role', 'listbox');

  const options = Array.from(selectEl.options || []);
  const selectedIdx = Math.max(0, selectEl.selectedIndex);
  btn.textContent = options[selectedIdx] ? options[selectedIdx].text : '';

  options.forEach((opt) => {
    const item = document.createElement('div');
    item.className = 'custom-select__option' + (opt.selected ? ' selected' : '');
    item.dataset.value = String(opt.value);
    item.textContent = opt.text;
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      selectEl.value = opt.value;
      btn.textContent = opt.text;
      list.querySelectorAll('.custom-select__option').forEach(el => el.classList.remove('selected'));
      item.classList.add('selected');
      selectEl.dispatchEvent(new Event('change', { bubbles: true }));
      wrap.classList.remove('open');
      openCustomSelect = null;
    });
    list.appendChild(item);
  });

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (openCustomSelect && openCustomSelect !== wrap) openCustomSelect.classList.remove('open');
    wrap.classList.toggle('open');
    openCustomSelect = wrap.classList.contains('open') ? wrap : null;
  });

  wrap.appendChild(btn);
  wrap.appendChild(list);
  selectEl.insertAdjacentElement('afterend', wrap);
}
