
function tagClass(name){
  return (name||'').toString().trim().toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu,'')   // strip accents
    .replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
}

async function getData(){ const res = await fetch('recipes.json'); return await res.json(); }
function card(recipe){
  return `<article class="card">
    <a href="recipe.html?slug=${encodeURIComponent(recipe.slug)}" aria-label="Open ${recipe.title}">
      <figure><img src="${recipe.image}" alt="${recipe.title}"></figure>
      <div class="body">
        <h3>${recipe.title}</h3>
        <p>${recipe.description}</p>
        <div class="tags">${recipe.tags.map(t=>`<span class="tag ${t.toLowerCase()}">${t}</span>`).join('')}</div>
      </div>
    </a>
  </article>`;
}
async function renderList(filter='', tagFilter=''){
  const data = await getData();
  const cards = document.getElementById('cards'); if(!cards) return;
  const q = filter.trim().toLowerCase();
  const filtered = data.recipes.filter(r => {
  const matchesText = !q || r.title.toLowerCase().includes(q) || r.tags.join(' ').toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
  const matchesTag = !tagFilter || (r.tags || []).some(t => t.toLowerCase() === tagFilter.toLowerCase());
  return matchesText && matchesTag;
});
  cards.innerHTML = filtered.map(card).join('') || '<p>Geen resultaten. Probeer een andere zoekterm.</p>';
}
async function loadRecipe(slug){
  const data = await getData();
  const r = data.recipes.find(x=>x.slug===slug) || data.recipes[0]; if(!r) return;
  document.title = r.title + ' — Kookboek';
  document.getElementById('r-image').src = r.image;
  document.getElementById('r-image').alt = r.title;
  document.getElementById('r-title').textContent = r.title;
  document.getElementById('r-desc').textContent = r.description;
  document.getElementById('r-time').textContent = r.time;
  document.getElementById('r-servings').textContent = r.servings;
  document.getElementById('r-tags').innerHTML = r.tags.map(t=>`<span class="tag ${t.toLowerCase()}">${t}</span>`).join('');
  document.getElementById('r-ingredients').innerHTML = r.ingredients.map(i=>`<li><label><input type="checkbox"> ${i}</label></li>`).join('');
  document.getElementById('r-steps').innerHTML = r.steps.map(s=>`<li>${s}</li>`).join('');
}
document.addEventListener('DOMContentLoaded',()=>{
  const search = document.getElementById('search');
  if(search){ renderListWithState(); let t; search.addEventListener('input',()=>{clearTimeout(t); t=setTimeout(()=>renderListWithState(),120);}); }
});


let __selectedTag = '';

async function renderListWithState(){
  const search = document.getElementById('search');
  const q = search ? search.value : '';
  await renderList(q, __selectedTag);
}

document.addEventListener('DOMContentLoaded', ()=>{
  const filters = document.getElementById('filters');
  if(filters){
    filters.addEventListener('click', (e)=>{
      const btn = e.target.closest('button[data-tag]');
      if(!btn) return;
      __selectedTag = btn.getAttribute('data-tag') || '';
      // active class
      [...filters.querySelectorAll('.chip')].forEach(b=>b.classList.toggle('active', b===btn));
      renderListWithState();
    });
  }
});
