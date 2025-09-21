
// Router
const btns = document.querySelectorAll('.btn[data-target]');
const sections = document.querySelectorAll('.section');
btns.forEach(b => b.addEventListener('click', () => {
  btns.forEach(x => x.classList.remove('active')); b.classList.add('active');
  sections.forEach(s => s.classList.toggle('active', s.id === b.dataset.target));
  location.hash = (b.dataset.target === 'page-dashboard') ? '' : '#deep';
}));
if (location.hash === '#deep') document.querySelector('.btn[data-target="page-deep"]').click();

// Deep table enhancements
(function(){
  const table = document.querySelector('#deep-table'); if(!table) return;
  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr'));
  const q = document.getElementById('q');
  const bankSel = document.getElementById('bankFilter');
  const riskSel = document.getElementById('riskFilter');
  const yearSel = document.getElementById('yearFilter');
  const info = document.getElementById('stats') || document.createElement('span');

  // Normalize links
  tbody.querySelectorAll('a[href]').forEach(a => a.setAttribute('href', a.getAttribute('href').replaceAll('\\','/')));

  const uniq = arr => [...new Set(arr)].filter(Boolean).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}));
  // try to infer columns: #, Bank, Year, Risk, Confidence, Presence, Report
  function col(idx){ return rows.map(r=> (r.children[idx] ? r.children[idx].innerText.trim() : '') ); }
  const banks = uniq(col(1)), years = uniq(col(2)), risks = uniq(col(3));
  banks.forEach(b=> bankSel && bankSel.insertAdjacentHTML('beforeend', `<option>${b}</option>`));
  years.forEach(y=> yearSel && yearSel.insertAdjacentHTML('beforeend', `<option>${y}</option>`));
  risks.forEach(r=> riskSel && riskSel.insertAdjacentHTML('beforeend', `<option>${r}</option>`));

  function apply(){
    const needle = (q && q.value || '').toLowerCase();
    const bank = bankSel && bankSel.value || '';
    const year = yearSel && yearSel.value || '';
    const risk = riskSel && riskSel.value || '';
    let visible = 0;
    rows.forEach(tr=>{
      const t = tr.innerText.toLowerCase();
      const tb = tr.children[1]?.innerText.trim();
      const ty = tr.children[2]?.innerText.trim();
      const trk = tr.children[3]?.innerText.trim();
      const match = (!needle || t.includes(needle))
        && (!bank || tb === bank)
        && (!year || ty === year)
        && (!risk || trk === risk);
      tr.style.display = match ? '' : 'none';
      if(match) visible++;
    });
    if (info) info.textContent = `Showing ${visible} of ${rows.length} rows`;
  }
  if (q) q.addEventListener('input', apply);
  [bankSel, riskSel, yearSel].forEach(x => x && x.addEventListener('change', apply));
  apply();

  // sortable headers
  const ths = table.querySelectorAll('thead th');
  ths.forEach((th, idx)=>{
    th.style.cursor='pointer'; th.title='Sort';
    let asc = true;
    th.addEventListener('click', ()=>{
      rows.sort((a,b)=>{
        const A = a.children[idx]?.innerText.trim() || '';
        const B = b.children[idx]?.innerText.trim() || '';
        const na = parseFloat(A.replace(/[^0-9.+-]/g,''));
        const nb = parseFloat(B.replace(/[^0-9.+-]/g,''));
        if (!Number.isNaN(na) && !Number.isNaN(nb)) return asc ? na-nb : nb-na;
        return asc ? A.localeCompare(B, undefined, {numeric:true}) : B.localeCompare(A, undefined, {numeric:true});
      });
      rows.forEach(r=> tbody.appendChild(r));
      asc = !asc;
    });
  });
})();

// SW
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./assets/sw.js');


// === WOW FEATURES IMPLEMENTATION ===
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const table = $('#deep-table');
  if (!table) return;
  const context = document.body;
  const isStandalone = location.pathname.endsWith('deep-research.html');

  const q = $('#q'), bankSel = $('#bankFilter'), yearSel = $('#yearFilter'), riskSel = $('#riskFilter');
  const chips = $$('.chip[data-riskchip]');
  const densityChip = $('.chip[data-density="toggle"]');
  const columnsBtn = $('#columnsBtn'), columnsMenu = $('#columnsMenu');
  const exportBtn = $('#exportCsv');
  const cmdBtn = $('#cmdBtn');
  const viewsSel = $('#views');
  const saveViewBtn = $('#saveView');
  const helpModal = $('#helpModal'); const helpClose = $('#helpClose');
  const cmdModal = $('#cmdModal'); const cmdClose = $('#cmdClose');
  const cmdInput = $('#cmdInput'); const cmdList = $('#cmdList');
  const previewModal = $('#previewModal'); const previewFrame = $('#previewFrame'); const previewTitle = $('#previewTitle');
  const prevBtn = $('#prevBtn'); const nextBtn = $('#nextBtn');
  const toast = $('#toast');
  const themer = $('#theme');

  const tbody = table.querySelector('tbody') || table;
  const rows = Array.from(tbody.querySelectorAll('tr'));

  // Column toggles
  const headers = table.querySelectorAll('thead th');
  const colCount = headers.length || (rows[0]?.children.length || 0);
  for (let i=0;i<colCount;i++){
    const name = headers[i]?.innerText.trim() || `Col ${i+1}`;
    const id = 'col_'+i;
    columnsMenu.insertAdjacentHTML('beforeend', `<label><input type="checkbox" id="${id}" checked/> ${name}</label>`);
    columnsMenu.addEventListener('change', (e)=>{
      if (e.target && e.target.id === id){
        const on = e.target.checked;
        (headers[i] && (headers[i].style.display = on ? '' : 'none'));
        rows.forEach(r => r.children[i] && (r.children[i].style.display = on ? '' : 'none'));
      }
    });
  }
  if (columnsBtn) columnsBtn.addEventListener('click', ()=> columnsBtn.parentElement.classList.toggle('open'));
  document.addEventListener('click', (e)=>{
    if (!columnsBtn) return;
    if (!columnsBtn.parentElement.contains(e.target)) columnsBtn.parentElement.classList.remove('open');
  });

  // Risk chips (High/Medium/Low)
  function applyChips(risk){
    if (!risk) return;
    if (riskSel) { riskSel.value = risk; riskSel.dispatchEvent(new Event('change')); }
    chips.forEach(c => c.classList.toggle('active', c.dataset.riskchip === risk));
  }
  chips.forEach(c => c.addEventListener('click', ()=> applyChips(c.dataset.riskchip)));

  // Density toggle
  let dense = false;
  if (densityChip) densityChip.addEventListener('click', ()=>{
    dense = !dense;
    table.classList.toggle('dense', dense);
    densityChip.classList.toggle('active', dense);
  });

  // Export CSV for visible rows
  function exportCSV(){
    const visible = rows.filter(r => r.style.display !== 'none');
    const cols = headers.length ? Array.from(headers).map(h=>h.innerText.trim()) : Array.from(rows[0].children).map((_,i)=> 'Col '+(i+1));
    let out = [cols.join(',')];
    visible.forEach(r => {
      const vals = Array.from(r.children).map(td => {
        let txt = td.innerText.replace(/\s+/g,' ').trim();
        // add link url if present
        const a = td.querySelector('a[href]'); if (a) txt += ` (${a.href})`;
        return '"' + txt.replace(/"/g,'""') + '"';
      });
      out.push(vals.join(','));
    });
    const blob = new Blob([out.join('\n')], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'deep-research-filtered.csv';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    showToast('Exported CSV');
  }
  if (exportBtn) exportBtn.addEventListener('click', exportCSV);

  // Saved Views (localStorage)
  const VKEY = 'research-views';
  function loadViews(){
    const all = JSON.parse(localStorage.getItem(VKEY) || '{}');
    viewsSel.innerHTML = '<option value="">Views</option>' + Object.keys(all).map(k=>`<option value="${k}">${k}</option>`).join('');
    return all;
  }
  function saveCurrentView(){
    const all = loadViews();
    const name = prompt('Save current filters as view name:');
    if (!name) return;
    all[name] = { q: q?.value||'', bank: bankSel?.value||'', year: yearSel?.value||'', risk: riskSel?.value||'', dense: dense };
    localStorage.setItem(VKEY, JSON.stringify(all));
    loadViews();
    showToast('View saved');
  }
  function applyView(name){
    const all = loadViews(); const v = all[name]; if (!v) return;
    if (q) q.value = v.q;
    if (bankSel) bankSel.value = v.bank;
    if (yearSel) yearSel.value = v.year;
    if (riskSel) riskSel.value = v.risk;
    if (v.dense) table.classList.add('dense'); else table.classList.remove('dense');
    document.dispatchEvent(new Event('apply-filters'));
    showToast(`View: ${name}`);
  }
  if (saveViewBtn) saveViewBtn.addEventListener('click', saveCurrentView);
  if (viewsSel) { loadViews(); viewsSel.addEventListener('change', ()=> viewsSel.value && applyView(viewsSel.value)); }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if (e.key === '?' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); openModal(helpModal); }
    if (e.key === '/' && !e.ctrlKey && !e.metaKey){ e.preventDefault(); q && q.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); openCmd(); }
  });
  if (cmdBtn) cmdBtn.addEventListener('click', openCmd);
  if (cmdClose) cmdClose.addEventListener('click', ()=> closeModal(cmdModal));
  if (helpClose) helpClose.addEventListener('click', ()=> closeModal(helpModal));

  // Row selection + j/k + Enter open
  let selIdx = -1;
  function selectRow(i){
    rows.forEach(r => r.classList.remove('row-selected'));
    if (i>=0 && i<rows.length && rows[i].style.display !== 'none'){
      selIdx = i; rows[i].classList.add('row-selected'); rows[i].scrollIntoView({block:'nearest'});
    }
  }
  document.addEventListener('keydown', (e)=>{
    if (['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)) return;
    if (e.key === 'j') { e.preventDefault(); let i = selIdx; do { i=(i+1)%rows.length; } while(rows[i].style.display==='none'); selectRow(i); }
    if (e.key === 'k') { e.preventDefault(); let i = selIdx; do { i=(i-1+rows.length)%rows.length; } while(rows[i].style.display==='none'); selectRow(i); }
    if (e.key === 'Enter' && selIdx>=0) {
      const a = rows[selIdx].querySelector('a[href]'); if (a) { openPreview(a.href, a.innerText); }
    }
  });

  // Preview modal for links (Alt+Click or Enter)
  tbody.addEventListener('click', (e)=>{
    const a = e.target.closest('a[href]'); if (!a) return;
    if (e.altKey){ e.preventDefault(); openPreview(a.href, a.innerText); }
  });
  function openPreview(href, title){
    previewTitle.textContent = title || 'Preview'; previewFrame.src = href; openModal(previewModal);
    // Map visible links for next/prev
    links = rows.filter(r => r.style.display!=='none').map(r => r.querySelector('a[href]')).filter(Boolean);
    curr = links.findIndex(x => x.href === href);
  }
  let links = [], curr = -1;
  function move(n){
    if (!links.length) return;
    curr = (curr + n + links.length) % links.length;
    const a = links[curr]; if (a) { previewFrame.src = a.href; previewTitle.textContent = a.innerText; }
  }
  if (prevBtn) prevBtn.addEventListener('click', ()=> move(-1));
  if (nextBtn) nextBtn.addEventListener('click', ()=> move(1));
  document.addEventListener('keydown', (e)=>{
    if (!isOpen(previewModal)) return;
    if (e.key === 'ArrowLeft') move(-1);
    if (e.key === 'ArrowRight') move(1);
  });

  // Command palette
  function openCmd(){
    fillCmd();
    openModal(cmdModal);
    cmdInput.value=''; cmdInput.focus();
  }
  function fillCmd(){
    const items = [];
    // actions
    items.push({t:'Focus Search', a:()=> q && q.focus()});
    items.push({t:'Export CSV', a:()=> exportCSV()});
    items.push({t:'Save View', a:()=> saveCurrentView()});
    // banks + years
    const bset = new Set(); rows.forEach(r => r.children[1] && bset.add(r.children[1].innerText.trim()));
    const yset = new Set(); rows.forEach(r => r.children[2] && yset.add(r.children[2].innerText.trim()));
    Array.from(bset).sort().forEach(b => items.push({t:`Bank: ${b}`, a:()=> {bankSel.value=b; document.dispatchEvent(new Event('apply-filters'));}}));
    Array.from(yset).sort().forEach(y => items.push({t:`Year: ${y}`, a:()=> {yearSel.value=y; document.dispatchEvent(new Event('apply-filters'));}}));
    cmdList.innerHTML = items.map((it,i)=> `<div class="cmd-item" data-idx="${i}">${it.t}</div>`).join('');
    cmdList._items = items;
  }
  cmdInput && cmdInput.addEventListener('input', ()=>{
    const qv = cmdInput.value.toLowerCase();
    $$('#cmdList .cmd-item').forEach(el => {
      el.style.display = el.textContent.toLowerCase().includes(qv) ? '' : 'none';
    });
  });
  cmdList && cmdList.addEventListener('click', (e)=>{
    const el = e.target.closest('.cmd-item'); if (!el) return;
    const idx = +el.dataset.idx; cmdList._items[idx].a(); closeModal(cmdModal);
  });

  // Fuzzy-ish highlight for search tokens
  function highlight(tr, query){
    Array.from(tr.children).forEach(td => {
      const a = td.querySelector('a'); // don't break links
      const base = a ? a.outerHTML : td.textContent;
      td.innerHTML = base; // reset
      if (!query) return;
      const tokens = query.trim().split(/\s+/).filter(Boolean);
      let html = td.innerHTML;
      tokens.forEach(tok=>{
        const re = new RegExp('(' + tok.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','ig');
        html = html.replace(re, '<span class="hl">$1</span>');
      });
      td.innerHTML = html;
    });
  }

  // Wire filters apply from main app
  function applyFilters(){
    const needle = (q && q.value || '').toLowerCase();
    const bank = bankSel && bankSel.value || '';
    const year = yearSel && yearSel.value || '';
    const risk = riskSel && riskSel.value || '';
    rows.forEach(tr => {
      const t = tr.innerText.toLowerCase();
      const tb = tr.children[1]?.innerText.trim(); const ty = tr.children[2]?.innerText.trim();
      const trk = tr.children[3]?.innerText.trim();
      const match = (!needle || t.includes(needle)) && (!bank || tb === bank) && (!year || ty === year) && (!risk || trk === risk);
      tr.style.display = match ? '' : 'none';
      highlight(tr, needle);
    });
  }
  document.addEventListener('apply-filters', applyFilters);
  ['input','change'].forEach(ev => { q && q.addEventListener(ev, ()=> document.dispatchEvent(new Event('apply-filters'))); });
  ;[bankSel, yearSel, riskSel].forEach(el => el && el.addEventListener('change', ()=> document.dispatchEvent(new Event('apply-filters'))));

  // Toast helper
  function showToast(msg){
    if (!toast) return;
    toast.textContent = msg; toast.classList.add('show');
    setTimeout(()=> toast.classList.remove('show'), 2600);
  }

  // Modal helpers
  function openModal(m){ if (!m) return; m.classList.add('backdrop-show'); }
  function closeModal(m){ if (!m) return; m.classList.remove('backdrop-show'); }
  function isOpen(m){ return m && m.classList.contains('backdrop-show'); }
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'Escape'){ [helpModal, cmdModal, previewModal].forEach(closeModal); }
  });
  document.addEventListener('click', (e)=>{
    [helpModal, cmdModal, previewModal].forEach(mod => {
      if (mod && mod.classList.contains('backdrop-show') && !mod.querySelector('.modal').contains(e.target)){
        closeModal(mod);
      }
    });
  });

  // Theme toggle
  if (themer){
    const saved = localStorage.getItem('theme-dark');
    const dark = saved !== 'false';
    themer.checked = dark;
    document.documentElement.style.setProperty('--bg', dark ? '#0b0f19' : '#f7f8fb');
    document.body.classList.toggle('light', !dark);
    themer.addEventListener('change', ()=>{
      localStorage.setItem('theme-dark', themer.checked ? 'true':'false'); location.reload();
    });
  }

  // Populate filters after DOM ready by reusing existing initialization from base script
  document.dispatchEvent(new Event('apply-filters'));
})();
