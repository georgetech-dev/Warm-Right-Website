(function () {
  const LIST_TABLE = 'site_feature_lists';
  const ITEM_TABLE = 'site_feature_list_items';

  function pageKeyFromPath() {
    const parts = window.location.pathname.toLowerCase().split('/').filter(Boolean);
    const isGitHub = window.location.hostname.includes('github.io');
    const usableParts = isGitHub && parts.length > 1 ? parts.slice(1) : parts;
    const file = usableParts[usableParts.length - 1] || 'index.html';
    const key = file.replace(/\.html$/, '') === 'index' ? 'home' : file.replace(/\.html$/, '');
    return key === 'testimonals' ? 'testimonials' : key;
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  }

  function listTitle(listEl) {
    let node = listEl.previousElementSibling;
    while (node) {
      if (/^h[1-3]$/i.test(node.tagName)) return node.textContent.replace(/\s+/g, ' ').trim();
      node = node.previousElementSibling;
    }
    return '';
  }

  function ensureStyles() {
    if (document.getElementById('managed-feature-list-styles')) return;
    const style = document.createElement('style');
    style.id = 'managed-feature-list-styles';
    style.textContent = `
      .managed-feature-list{list-style:none;padding-left:0}
      .managed-feature-list>li.has-managed-icon{display:flex;align-items:flex-start;gap:12px}
      .managed-feature-list-icon{flex:0 0 auto;object-fit:contain;margin-top:.1em}
      .managed-feature-list-text{min-width:0}
    `;
    document.head.appendChild(style);
  }

  function prepareLists() {
    const pageKey = pageKeyFromPath();
    const lists = Array.from(document.querySelectorAll('ul.values-list'));
    lists.forEach((list, index) => {
      if (!list.dataset.featureList) list.dataset.featureList = `${pageKey}:list-${index + 1}`;
      if (!list.dataset.featureTitle) list.dataset.featureTitle = listTitle(list);
    });
    return lists;
  }

  function renderList(listEl, listRow, items) {
    const activeItems = items
      .filter(item => item.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    if (!activeItems.length) return;

    listEl.classList.add('managed-feature-list');
    listEl.innerHTML = activeItems.map(item => {
      const useIcon = item.use_icon && item.icon_url;
      const iconSize = Math.max(8, Number(item.icon_size || 22));
      const text = `<span class="managed-feature-list-text">${item.item_html || ''}</span>`;
      if (!useIcon) return `<li class="card">${text}</li>`;
      const iconSrc = window.WarmRightImages?.imageUrl(item.icon_url) || item.icon_url;
      const raw = window.WarmRightImages?.githubRawUrl(item.icon_url) || '';
      return `
        <li class="card has-managed-icon">
          <img class="managed-feature-list-icon" src="${escapeHtml(iconSrc)}" alt="" aria-hidden="true" width="${iconSize}" height="${iconSize}" data-github-fallback="${escapeHtml(raw)}" onerror="if(this.dataset.githubFallback && this.dataset.githubFallback !== this.src){this.src=this.dataset.githubFallback;this.dataset.githubFallback='';}else{this.style.display='none';}">
          ${text}
        </li>
      `;
    }).join('');
  }

  async function loadFeatureLists() {
    ensureStyles();
    const targets = prepareLists();
    if (!targets.length || !window.db) return;

    const pageKey = pageKeyFromPath();
    const keys = targets.map(list => list.dataset.featureList).filter(Boolean);
    const { data: lists, error: listsError } = await window.db
      .from(LIST_TABLE)
      .select('*')
      .eq('page_key', pageKey)
      .in('list_key', keys);
    if (listsError || !lists?.length) return;

    const activeLists = lists.filter(list => list.is_active !== false);
    if (!activeLists.length) return;

    const { data: items, error: itemsError } = await window.db
      .from(ITEM_TABLE)
      .select('*')
      .in('list_key', activeLists.map(list => list.list_key))
      .order('sort_order', { ascending: true });
    if (itemsError || !items) return;

    const listMap = new Map(activeLists.map(list => [list.list_key, list]));
    const itemGroups = items.reduce((acc, item) => {
      acc[item.list_key] = acc[item.list_key] || [];
      acc[item.list_key].push(item);
      return acc;
    }, {});

    targets.forEach(listEl => {
      const listRow = listMap.get(listEl.dataset.featureList);
      if (listRow) renderList(listEl, listRow, itemGroups[listRow.list_key] || []);
    });
    if (typeof window.observeRevealCards === 'function') window.observeRevealCards(document);
  }

  document.addEventListener('includesLoaded', loadFeatureLists);
  if (document.readyState !== 'loading') loadFeatureLists();
})();
