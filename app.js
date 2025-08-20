console.log('Kookboek version v19');

// Normalize ingredient list: split combined lines into separate items.
// We split on commas, semicolons, middle dots, and newlines.
function normalizeIngredients(list){
  const out = [];
  (list||[]).forEach(item=>{
    if(typeof item !== 'string'){ return; }
    const parts = item.split(/[,;•\u2022\u00B7\n]+/g).map(s=>s.trim()).filter(Boolean);
    if(parts.length<=1){ out.push(item.trim()); }
    else{ out.push(...parts); }
  });
  return out;
}


const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>Array.from(e.querySelectorAll(s));
let ALL=[], FILTERED=[], currentCat='Alle', currentIndex=0;
function showToast(msg){const t=document.getElementById('toast');if(!t)return;t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}

// Read image file as base64 (and resize to max 1400px width to keep JSON small)
function fileToDataURL(file) {
  return new Promise((resolve, reject)=>{
    const reader = new FileReader();
    reader.onerror = ()=>reject(new Error('Lezen mislukt'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxW = 1400;
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        try {
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          resolve(dataUrl);
        } catch(e) { resolve(reader.result); }
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}


// Tabs -> category filter
$$('.tab').forEach(b=>b.addEventListener('click',()=>{ document.body.style.overflow=''; const d=$('#detail'); if(d) d.classList.add('hidden'); const s=$('#shopping'); if(s) s.classList.add('hidden');
  $$('.tab').forEach(x=>x.classList.toggle('active', x===b));
  currentCat = b.dataset.cat;
  filterAndRender();
}));

$('#search').addEventListener('input', filterAndRender);
$('#toListTop').addEventListener('click', openShopping);

(async function bootstrap(){
  const res = await fetch('./recipes.json', { cache: 'no-store' });
  ALL = res.ok ? await res.json() : [];
  filterAndRender();
})();

function filterAndRender(){
  const q = ($('#search').value||'').toLowerCase();
  FILTERED = ALL.filter(r => 
    (currentCat==='Alle' || (r.category||'').toLowerCase()===currentCat.toLowerCase()) &&
    ( (r.title||'').toLowerCase().includes(q) ||
      normalizeIngredients(r.ingredients).some(i => (i||'').toLowerCase().includes(q)) )
  );
  $('#emptyState').style.display = FILTERED.length ? 'none' : 'block';
  const grid = $('#grid'); grid.innerHTML = '';
  FILTERED.forEach((r, idx) => {
    const li = $('#cardTpl').content.firstElementChild.cloneNode(true);
    li.querySelector('.thumb').src = r.image || 'placeholder.jpg';
    li.querySelector('.title').textContent = r.title || 'Onbekend recept';
    li.querySelector('.subtitle').textContent = `${normalizeIngredients(r.ingredients).length} ingrediënten · ${r.category||''}`;
    li.addEventListener('click', ()=> openDetail(idx));
    grid.appendChild(li);
  });
}

// ---------- Detail view ----------
const detail = $('#detail'), backBtn = $('#backBtn');
const dTitle = $('#dTitle'), dCat = $('#dCat'), dImg = $('#dImg'), dIngr = $('#dIngr'), dSteps = $('#dSteps');
const sendToShoppingBtn = $('#sendToShopping');
const toListFromDetail = $('#toListFromDetail');

function openDetail(idx){
  currentIndex = idx;
  renderDetail();
  detail.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeDetail(){
  detail.classList.add('hidden');
  document.body.style.overflow='';
}
backBtn.addEventListener('click', closeDetail);
toListFromDetail.addEventListener('click', openShopping);

function keyForRecipe(r){ return (r.title||'').toLowerCase().replace(/\s+/g,'_'); }

function renderDetail(){
  const r = FILTERED[currentIndex]; if(!r) return;
  dTitle.textContent = r.title || '';
  dCat.textContent = r.category || '';
  dImg.src = r.image || 'placeholder.jpg';

  // Load per-recipe checkbox state
  const storeKey = 'ingr_state_'+keyForRecipe(r);
  const state = JSON.parse(localStorage.getItem(storeKey) || '{}'); // {index: true/false}

  // Build ingredients with checkboxes
  dIngr.innerHTML = '';
  normalizeIngredients(r.ingredients).forEach((txt, i)=>{
    const li = document.createElement('li');
    const cb = document.createElement('input'); cb.type='checkbox'; cb.checked = !!state[i];
    const span = document.createElement('span'); span.textContent = txt; if(cb.checked) span.classList.add('done');
    cb.addEventListener('change', ()=>{
      if(cb.checked){ state[i] = true; span.classList.add('done'); } else { delete state[i]; span.classList.remove('done'); }
      localStorage.setItem(storeKey, JSON.stringify(state));
    });
    li.appendChild(cb); li.appendChild(span);
    dIngr.appendChild(li);
  });

  // Steps
  dSteps.innerHTML = ''; (r.steps||[]).forEach(s=>{ const li=document.createElement('li'); li.textContent=s; dSteps.appendChild(li); });

  // "Naar boodschappenlijst" -> only unchecked ones, and replace list (single-recipe mode)
  sendToShoppingBtn.onclick = ()=>{
    const unchecked = [];
    dIngr.querySelectorAll('li').forEach((li, idx)=>{
      const cb = li.querySelector('input[type=checkbox]');
      const text = li.querySelector('span').textContent;
      if(!cb.checked) unchecked.push(text);
    });
    const payload = { from: r.title || '', items: unchecked };
    localStorage.setItem('shoppingList', JSON.stringify(payload));
    openShopping();
  };
}

// Swipe within category
let startX=null;
detail.addEventListener('touchstart', e=>{ startX = e.changedTouches[0].clientX; }, {passive:true});
detail.addEventListener('touchend', e=>{
  if(startX==null) return;
  const dx = e.changedTouches[0].clientX - startX;
  if(Math.abs(dx) > 50){
    if(dx < 0 && currentIndex < FILTERED.length-1){ currentIndex++; renderDetail(); }
    if(dx > 0 && currentIndex > 0){ currentIndex--; renderDetail(); }
  }
  startX = null;
}, {passive:true});
document.addEventListener('keydown', e=>{
  if(detail.classList.contains('hidden')) return;
  if(e.key==='ArrowLeft' && currentIndex>0){ currentIndex--; renderDetail(); }
  if(e.key==='ArrowRight' && currentIndex<FILTERED.length-1){ currentIndex++; renderDetail(); }
  if(e.key==='Escape'){ closeDetail(); }
});

// ---------- Shopping list ----------
const shopping = $('#shopping');
const closeShoppingBtn = $('#closeShopping');
const shoppingListEl = $('#shoppingList');
const clearShoppingBtn = $('#clearShopping');

function openShopping(){
  renderShopping();
  shopping.classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeShopping(){
  shopping.classList.add('hidden');
  document.body.style.overflow='';
}
closeShoppingBtn.addEventListener('click', closeShopping);

function renderShopping(){
  shoppingListEl.innerHTML = '';
  const payload = JSON.parse(localStorage.getItem('shoppingList') || '{"from":"","items":[]}');
  const items = Array.isArray(payload.items) ? payload.items : [];
  items.forEach((t, i)=>{
    const li = document.createElement('li');
    const cb = document.createElement('input'); cb.type='checkbox';
    const span = document.createElement('span'); span.textContent = t;
    const listStateKey = 'shopping_state';
    const listState = JSON.parse(localStorage.getItem(listStateKey) || '{}');
    cb.checked = !!listState[i];
    if(cb.checked) span.classList.add('done');
    cb.addEventListener('change', ()=>{
      if(cb.checked){ listState[i] = true; span.classList.add('done'); }
      else { delete listState[i]; span.classList.remove('done'); }
      localStorage.setItem(listStateKey, JSON.stringify(listState));
    });
    li.appendChild(cb); li.appendChild(span);
    shoppingListEl.appendChild(li);
  });
}

clearShoppingBtn.addEventListener('click', ()=>{
  localStorage.removeItem('shoppingList');
  localStorage.removeItem('shopping_state');
  renderShopping();
});



// --- New recipe flow ---
const fabAdd = document.getElementById('fabAdd');
const newDialog = document.getElementById('newDialog');
const newForm = document.getElementById('newForm');

fabAdd.addEventListener('click', ()=> newDialog.showModal());

newForm.addEventListener('close', async ()=>{
  if(newForm.returnValue !== 'save') return;
  const photoFile = document.getElementById('nPhoto').files[0];
  const item = {
    title: document.getElementById('nTitle').value.trim(),
    category: document.getElementById('nCategory').value,
    image: '',
    ingredients: document.getElementById('nIngredients').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
    steps: document.getElementById('nSteps').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
  };
  if(!item.title){ alert('Titel is verplicht'); return; }
  const urlInput = document.getElementById('nImage').value.trim();
  if(photoFile){
    try { item.image = await fileToDataURL(photoFile); } catch(e) { console.warn(e); item.image = urlInput; }
  } else {
    item.image = urlInput;
  }
  ALL.unshift(item);
  filterAndRender();
  downloadRecipes(ALL);
  newForm.querySelectorAll('input, textarea').forEach(el=>{ if(el.type!=='button') el.value=''; });
  document.getElementById('nPhoto').value='';
});

function downloadRecipes(arr){
  const blob = new Blob([JSON.stringify(arr, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'recipes.json';
  document.body.appendChild(a); a.click(); a.remove();
}


// --- Edit recipe flow ---
document.addEventListener('DOMContentLoaded', ()=>{
  const editBtn = document.getElementById('editBtn');
  const editDialog = document.getElementById('editDialog');
  const editForm = document.getElementById('editForm');
  const eTitle = document.getElementById('eTitle');
  const eCategory = document.getElementById('eCategory');
  const ePreview = document.getElementById('ePreview');
  const ePhoto = document.getElementById('ePhoto');
  const eImageUrl = document.getElementById('eImageUrl');
  const eIngredients = document.getElementById('eIngredients');
  const eSteps = document.getElementById('eSteps');

  if(editBtn && editDialog){
    editBtn.addEventListener('click', ()=>{
      const r = FILTERED[currentIndex]; if(!r) return;
      eTitle.value = r.title || '';
      eCategory.value = r.category || 'Diner';
      ePreview.src = r.image || '';
      eImageUrl.value = '';
      if(ePhoto) ePhoto.value = '';
      eIngredients.value = (r.ingredients||[]).join('\n');
      eSteps.value = (r.steps||[]).join('\n');
      editDialog.showModal();
    });
  }

  if(editForm){
    editForm.addEventListener('close', async ()=>{
      if(editForm.returnValue !== 'save') return;
      const r = FILTERED[currentIndex]; if(!r) return;
      const idx = ALL.indexOf(r);
      const updated = {
        ...r,
        title: eTitle.value.trim(),
        category: eCategory.value,
        ingredients: eIngredients.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
        steps: eSteps.value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
      };
      const urlInput = (eImageUrl&&eImageUrl.value? eImageUrl.value.trim() : '');
      const file = (ePhoto && ePhoto.files) ? ePhoto.files[0] : null;
      if(file){
        try { updated.image = await fileToDataURL(file); } catch(e){ console.warn(e); if(urlInput) updated.image = urlInput; }
      } else if(urlInput){
        updated.image = urlInput;
      } else {
        updated.image = r.image || '';
      }

      if(idx>=0){ ALL[idx] = updated; }
      filterAndRender();
      const newFilteredIdx = FILTERED.findIndex(x=> x.title === updated.title && x.category === updated.category);
      if(newFilteredIdx >= 0){
        currentIndex = newFilteredIdx;
        const dOpen = !document.getElementById('detail').classList.contains('hidden');
        if(dOpen){ renderDetail(); }
      }

      const blob = new Blob([JSON.stringify(ALL, null, 2)], {type:'application/json'});
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='recipes.json';
      document.body.appendChild(a); a.click(); a.remove();
      if(typeof showToast === 'function'){ showToast('✅ Recept bewerkt! Upload de nieuwe recipes.json naar GitHub.'); }
    });
  }
});


// Delegated click for dynamic buttons
document.addEventListener('click', (e)=>{
  const editBtn = e.target.closest && e.target.closest('#editBtn');
  if(editBtn){ e.preventDefault(); openEdit(); }
});

function openEdit(){
  const editDialog = document.getElementById('editDialog');
  const eTitle = document.getElementById('eTitle');
  const eCategory = document.getElementById('eCategory');
  const ePreview = document.getElementById('ePreview');
  const ePhoto = document.getElementById('ePhoto');
  const eImageUrl = document.getElementById('eImageUrl');
  const eIngredients = document.getElementById('eIngredients');
  const eSteps = document.getElementById('eSteps');
  const r = FILTERED[currentIndex]; if(!r || !editDialog) return;
  eTitle.value = r.title || '';
  eCategory.value = r.category || 'Diner';
  ePreview.src = r.image || '';
  if(ePhoto) ePhoto.value='';
  if(eImageUrl) eImageUrl.value='';
  eIngredients.value = (r.ingredients||[]).join('\n');
  eSteps.value = (r.steps||[]).join('\n');
  editDialog.showModal();
}


// Ultra-robust delegation for Edit action (supports multiple selectors/attributes)
document.addEventListener('click', (e)=>{
  const target = e.target;
  const editEl = target.closest && target.closest('#editBtn, .btn-edit, [data-action="edit"], button[title^="Bewerk"]');
  if(editEl){
    e.preventDefault();
    try { openEdit(); } catch(err) { console.error('openEdit error', err); }
  }
});


// --- Nieuw tab (no modal) ---
const tabNewEl = document.getElementById('tab-new');
const gridEl = document.getElementById('grid');
const emptyStateEl = document.getElementById('emptyState');
const searchEl = document.getElementById('search');

$$('.tab').forEach(b=>b.addEventListener('click',()=>{
  $$('.tab').forEach(x=>x.classList.toggle('active', x===b));
  currentCat = b.dataset.cat;
  if(currentCat === 'Nieuw'){
    if(tabNewEl){ tabNewEl.classList.add('show'); tabNewEl.classList.remove('hidden'); }
    if(gridEl){ gridEl.style.display='none'; }
    if(emptyStateEl){ emptyStateEl.style.display='none'; }
    if(searchEl){ searchEl.style.display='none'; }
  }else{
    if(tabNewEl){ tabNewEl.classList.remove('show'); }
    if(gridEl){ gridEl.style.display='grid'; }
    if(searchEl){ searchEl.style.display='block'; }
    filterAndRender();
  }
}));

const newFormFull = document.getElementById('newFormFull');
if(newFormFull){
  newFormFull.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const photoFile = (document.getElementById('nPhoto')||{}).files ? document.getElementById('nPhoto').files[0] : null;
    const item = {
      title: document.getElementById('nTitle').value.trim(),
      category: document.getElementById('nCategory').value,
      image: '',
      ingredients: document.getElementById('nIngredients').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      steps: document.getElementById('nSteps').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    };
    if(!item.title){ alert('Titel is verplicht'); return; }
    const urlInput = (document.getElementById('nImage')||{}).value ? document.getElementById('nImage').value.trim() : '';
    if(photoFile){
      try { item.image = await fileToDataURL(photoFile); } catch(e){ console.warn(e); item.image = urlInput; }
    } else { item.image = urlInput; }

    ALL.unshift(item);
    const blob = new Blob([JSON.stringify(ALL, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='recipes.json';
    document.body.appendChild(a); a.click(); a.remove();

    ['nTitle','nImage','nIngredients','nSteps'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const p=document.getElementById('nPhoto'); if(p) p.value='';

    const firstTab = $$('.tab')[0]; if(firstTab){ firstTab.click(); }
    filterAndRender();
    if(typeof showToast === 'function'){ showToast('✅ Recept toegevoegd! Upload de nieuwe recipes.json naar GitHub.'); }
  });
}


// FAB (+) should open the Nieuw tab explicitly
(function(){
  const fab = document.getElementById('fabAdd');
  if(!fab) return;
  fab.addEventListener('click', (e)=>{
    e.preventDefault();
    const nieuwBtn = Array.from(document.querySelectorAll('.tab'))
      .find(b => (b.dataset && b.dataset.cat === 'Nieuw') || /nieuw/i.test(b.textContent||''));
    if(nieuwBtn){
      nieuwBtn.click();
      setTimeout(()=>{ const t=document.getElementById('nTitle'); if(t) t.focus(); }, 50);
      const form = document.getElementById('newFormFull');
      if(form) form.scrollIntoView({behavior:'smooth', block:'start'});
    }
  });
})();


// ===== Bewerk-flow =====
let EDITING_INDEX = -1;

function openEditFromIndex(idx){
  try{
    const r = ALL[idx]; if(!r) return;
    const nieuwBtn = Array.from(document.querySelectorAll('.tab'))
      .find(b => (b.dataset && b.dataset.cat === 'Nieuw') || /nieuw/i.test(b.textContent||''));
    if(nieuwBtn) nieuwBtn.click();

    EDITING_INDEX = idx;
    const mode = document.getElementById('editMode'); if(mode) mode.value = 'true';
    const ei = document.getElementById('editIndex'); if(ei) ei.value = String(idx);
    const setVal = (id,val)=>{ const el=document.getElementById(id); if(el) el.value = val||''; };
    setVal('nTitle', r.title);
    setVal('nCategory', r.category||'Ontbijt');
    setVal('nImage', (r.image && r.image.startsWith('http')) ? r.image : '');
    const ing = document.getElementById('nIngredients'); if(ing) ing.value = (r.ingredients||[]).join('\n');
    const stp = document.getElementById('nSteps'); if(stp) stp.value = (r.steps||[]).join('\n');
    const ph = document.getElementById('nPhoto'); if(ph) ph.value='';
    const btn = document.getElementById('nSaveFull'); if(btn) btn.textContent = 'Opslaan';
    setTimeout(()=>{ const t=document.getElementById('nTitle'); if(t) t.focus(); }, 50);
  }catch(e){ console.error('openEditFromIndex error', e); }
}

document.addEventListener('click', (e)=>{
  const el = e.target.closest && e.target.closest('[data-action="edit"], #editBtn');
  if(!el) return;
  e.preventDefault();
  if(el.id === 'editBtn'){
    openEditFromIndex(currentIndex || 0);
    return;
  }
  const card = e.target.closest('.card');
  if(card){
    const titleEl = card.querySelector('.card-title');
    if(titleEl){
      const title = (titleEl.textContent||'').trim();
      const idx = ALL.findIndex(x=> (x.title||'').trim() === title);
      if(idx>=0){ openEditFromIndex(idx); }
    }
  }
});

(function(){
  const form = document.getElementById('newFormFull');
  if(!form) return;
  const btn = document.getElementById('nSaveFull');
  form.addEventListener('submit', async (e)=>{
    e.preventDefault();
    const isEdit = (document.getElementById('editMode')||{}).value === 'true';
    const idxVal = parseInt((document.getElementById('editIndex')||{}).value||'-1',10);
    const photoFile = (document.getElementById('nPhoto')||{}).files ? document.getElementById('nPhoto').files[0] : null;
    const item = {
      title: document.getElementById('nTitle').value.trim(),
      category: document.getElementById('nCategory').value,
      image: '',
      ingredients: document.getElementById('nIngredients').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean),
      steps: document.getElementById('nSteps').value.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)
    };
    if(!item.title){ alert('Titel is verplicht'); return; }
    const urlInput = (document.getElementById('nImage')||{}).value ? document.getElementById('nImage').value.trim() : '';
    if(photoFile){
      try { item.image = await fileToDataURL(photoFile); } catch(e){ console.warn(e); item.image = urlInput; }
    } else {
      if(isEdit && ALL[idxVal] && ALL[idxVal].image && !/^https?:/i.test(ALL[idxVal].image)){
        item.image = ALL[idxVal].image;
      } else {
        item.image = urlInput || (ALL[idxVal] ? ALL[idxVal].image||'' : '');
      }
    }

    if(isEdit && idxVal>=0){
      ALL[idxVal] = item;
    }else{
      ALL.unshift(item);
    }

    const blob = new Blob([JSON.stringify(ALL, null, 2)], {type:'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download='recipes.json';
    document.body.appendChild(a); a.click(); a.remove();

    if(document.getElementById('editMode')) document.getElementById('editMode').value = 'false';
    if(document.getElementById('editIndex')) document.getElementById('editIndex').value = '-1';
    ['nTitle','nImage','nIngredients','nSteps'].forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
    const p=document.getElementById('nPhoto'); if(p) p.value='';
    if(btn) btn.textContent = 'Toevoegen';

    const firstTab = Array.from(document.querySelectorAll('.tab')).find(b=>/alle/i.test(b.textContent||''));
    if(firstTab){ firstTab.click(); }
    filterAndRender();
    if(typeof showToast === 'function'){ showToast(isEdit ? '✅ Recept bijgewerkt!' : '✅ Recept toegevoegd!'); }
  });
})();


// ===== Robust event delegation for New/Edit =====
(function(){
  const tabNewEl = document.getElementById('tab-new');
  const gridEl = document.getElementById('grid');
  const emptyEl = document.getElementById('emptyState');
  const searchEl = document.getElementById('search');

  function openNewTab(){
    // Activate "Nieuw" tab button if present, else just show the section
    const nieuwBtn = Array.from(document.querySelectorAll('.tab')).find(b => 
      (b.dataset && b.dataset.cat === 'Nieuw') || /nieuw/i.test(b.textContent||''));
    if(nieuwBtn){
      document.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active', x===nieuwBtn));
    }
    if(tabNewEl) tabNewEl.classList.add('show');
    if(gridEl) gridEl.style.display='none';
    if(emptyEl) emptyEl.style.display='none';
    if(searchEl) searchEl.style.display='none';
    const t = document.getElementById('nTitle'); if(t) t.focus();
    const form = document.getElementById('newFormFull'); if(form) form.scrollIntoView({behavior:'smooth', block:'start'});
  }

  document.addEventListener('click', (e)=>{
    const a = e.target.closest('[data-action]');
    if(!a) return;
    const act = a.getAttribute('data-action');
    if(act === 'new'){
      e.preventDefault();
      openNewTab();
      return;
    }
    if(act === 'edit'){
      e.preventDefault();
      // use currentIndex if coming from detail header edit
      if(a.id === 'editBtn'){ openEditFromIndex(currentIndex||0); return; }
      // or infer from card title
      const card = a.closest('.card');
      if(card){
        const title = (card.querySelector('.card-title')?.textContent||'').trim();
        const idx = ALL.findIndex(x=>(x.title||'').trim()===title);
        if(idx>=0) openEditFromIndex(idx);
      }
    }
  });
})();
