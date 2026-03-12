/* ============================================
   THE MORNING READ — app.js
   Uses NewsAPI (newsapi.org) — replace API_KEY
   ============================================ */

// ─── CONFIG ───────────────────────────────────
// 👉 Get a free key at https://newsapi.org/register
// Then replace the string below with your key.
const API_KEY = 'YOUR_API_KEY_HERE';
const BASE    = 'https://newsapi.org/v2';

// ─── STATE ────────────────────────────────────
let currentCategory = 'general';
let currentQuery    = '';
let currentPage     = 1;
let allArticles     = [];
let isFetching      = false;

// ─── DOM REFS ─────────────────────────────────
const featuredCard = document.getElementById('featuredCard');
const newsGrid     = document.getElementById('newsGrid');
const loadMoreBtn  = document.getElementById('loadMoreBtn');
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalInner   = document.getElementById('modalInner');
const modalClose   = document.getElementById('modalClose');
const dateLine     = document.getElementById('dateLine');

// ─── INIT ─────────────────────────────────────
setDateLine();
fetchNews();

// ─── DATE LINE ────────────────────────────────
function setDateLine() {
  const now = new Date();
  dateLine.textContent = now.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

// ─── CATEGORY NAV ─────────────────────────────
document.querySelectorAll('.cat-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentCategory = btn.dataset.category;
    currentQuery    = '';
    searchInput.value = '';
    currentPage     = 1;
    allArticles     = [];
    featuredCard.innerHTML = '';
    newsGrid.innerHTML = '';
    fetchNews();
  });
});

// ─── SEARCH ───────────────────────────────────
searchBtn.addEventListener('click', doSearch);
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(); });

function doSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  currentQuery    = q;
  currentCategory = '';
  currentPage     = 1;
  allArticles     = [];
  featuredCard.innerHTML = '';
  newsGrid.innerHTML = '';
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  fetchNews();
}

// ─── LOAD MORE ────────────────────────────────
loadMoreBtn.addEventListener('click', () => {
  currentPage++;
  fetchNews(true);
});

// ─── FETCH ────────────────────────────────────
async function fetchNews(append = false) {
  if (isFetching) return;
  isFetching = true;
  loadMoreBtn.disabled = true;

  if (!append) showLoading();

  // Demo mode: if no real API key, use mock data
  if (API_KEY === 'YOUR_API_KEY_HERE') {
    await simulateFetch(append);
    isFetching = false;
    loadMoreBtn.disabled = false;
    return;
  }

  let url;
  if (currentQuery) {
    url = `${BASE}/everything?q=${encodeURIComponent(currentQuery)}&page=${currentPage}&pageSize=9&language=en&apiKey=${API_KEY}`;
  } else {
    url = `${BASE}/top-headlines?category=${currentCategory}&page=${currentPage}&pageSize=9&language=en&country=us&apiKey=${API_KEY}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== 'ok') throw new Error(data.message || 'API error');

    const fresh = (data.articles || []).filter(a => a.title && a.title !== '[Removed]');
    if (!append) allArticles = fresh;
    else allArticles = allArticles.concat(fresh);

    render(append);

    loadMoreBtn.style.display = fresh.length < 9 ? 'none' : 'inline-block';
    loadMoreBtn.disabled = false;

  } catch (err) {
    showError(err.message);
  } finally {
    isFetching = false;
  }
}

// ─── LOADING STATE ────────────────────────────
function showLoading() {
  newsGrid.innerHTML = `
    <div class="loader-wrap">
      <span class="loader"></span>
      <span class="loader-text">Gathering the morning's stories…</span>
    </div>`;
  featuredCard.innerHTML = '';
}

// ─── ERROR STATE ──────────────────────────────
function showError(msg) {
  newsGrid.innerHTML = `
    <div class="empty-state">
      <div class="empty-emoji">📰</div>
      <h3>Couldn't fetch the news</h3>
      <p>${msg || 'Something went wrong. Try again in a moment.'}</p>
    </div>`;
}

// ─── RENDER ───────────────────────────────────
function render(append) {
  if (!allArticles.length) {
    newsGrid.innerHTML = `
      <div class="empty-state">
        <div class="empty-emoji">🔍</div>
        <h3>Nothing found</h3>
        <p>Try a different search or browse another category.</p>
      </div>`;
    featuredCard.innerHTML = '';
    return;
  }

  // Featured = first article
  if (!append && allArticles.length > 0) {
    renderFeatured(allArticles[0]);
  }

  const gridArticles = append ? allArticles.slice(-9) : allArticles.slice(1);

  if (!append) newsGrid.innerHTML = '';

  gridArticles.forEach((article, i) => {
    const card = buildCard(article);
    card.style.animationDelay = `${(i % 9) * 0.05}s`;
    newsGrid.appendChild(card);
  });
}

// ─── FEATURED CARD ────────────────────────────
function renderFeatured(article) {
  const imgHtml = article.urlToImage
    ? `<img class="featured-img" src="${article.urlToImage}" alt="${sanitize(article.title)}" onerror="this.parentElement.innerHTML='<div class=featured-img-placeholder>${getCategoryEmoji(currentCategory)}</div>'">`
    : `<div class="featured-img-placeholder">${getCategoryEmoji(currentCategory)}</div>`;

  featuredCard.innerHTML = `
    ${imgHtml}
    <div class="featured-body">
      <div class="featured-label">${article.source?.name || 'Top Story'}</div>
      <h2 class="featured-title">${sanitize(article.title)}</h2>
      <p class="featured-desc">${sanitize(article.description || 'Read the full story…')}</p>
      <div class="featured-meta">
        <span>✍️ ${article.author ? sanitize(article.author.split(',')[0]) : 'Staff Writer'}</span>
        <span>🕐 ${timeAgo(article.publishedAt)}</span>
      </div>
    </div>`;

  featuredCard.onclick = () => openModal(article);
}

// ─── GRID CARD ────────────────────────────────
function buildCard(article) {
  const card = document.createElement('div');
  card.className = 'news-card';

  const imgHtml = article.urlToImage
    ? `<img class="card-img" src="${article.urlToImage}" alt="" loading="lazy" onerror="this.outerHTML='<div class=card-img-placeholder>${getCategoryEmoji(currentCategory)}</div>'">`
    : `<div class="card-img-placeholder">${getCategoryEmoji(currentCategory)}</div>`;

  card.innerHTML = `
    ${imgHtml}
    <div class="card-body">
      <div class="card-source">${article.source?.name || 'News'}</div>
      <h3 class="card-title">${sanitize(article.title)}</h3>
      <p class="card-desc">${sanitize(article.description || '')}</p>
      <div class="card-footer">
        <span>${article.author ? sanitize(article.author.split(',')[0]) : 'Staff'}</span>
        <span>${timeAgo(article.publishedAt)}</span>
      </div>
    </div>`;

  card.addEventListener('click', () => openModal(article));
  return card;
}

// ─── MODAL ────────────────────────────────────
function openModal(article) {
  const imgHtml = article.urlToImage
    ? `<img class="modal-img" src="${article.urlToImage}" alt="" onerror="this.remove()">`
    : '';

  modalInner.innerHTML = `
    <div class="modal-source-tag">${article.source?.name || 'News'}</div>
    <h2 class="modal-title">${sanitize(article.title)}</h2>
    <div class="modal-meta">
      <span>✍️ ${article.author ? sanitize(article.author.split(',')[0]) : 'Staff Writer'}</span>
      <span>🕐 ${formatDate(article.publishedAt)}</span>
    </div>
    ${imgHtml}
    <p class="modal-desc">${sanitize(article.description || article.content || 'Click below to read the full article.')}</p>
    ${article.url ? `<a class="modal-read-more" href="${article.url}" target="_blank" rel="noopener">Read full story →</a>` : ''}
  `;

  modalOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modalOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── HELPERS ──────────────────────────────────
function sanitize(str) {
  if (!str) return '';
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60)    return 'Just now';
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function getCategoryEmoji(cat) {
  const map = {
    general: '📰', technology: '💻', science: '🔬',
    health: '🌿', business: '📈', entertainment: '🎬', sports: '⚽'
  };
  return map[cat] || '📰';
}

// ─── DEMO / MOCK DATA ─────────────────────────
// Used when no API key is set so the UI is fully previewed.
async function simulateFetch(append) {
  await new Promise(r => setTimeout(r, 800));

  const mockArticles = [
    {
      title: "Scientists Discover a New Species of Deep-Sea Fish That Glows in the Dark",
      description: "Researchers at the Monterey Bay Aquarium Research Institute have identified a remarkable new species of bioluminescent fish living more than 3,000 meters below the ocean surface, offering fresh insights into deep-sea ecosystems.",
      author: "Dr. Amara Chen",
      source: { name: "Science Daily" },
      publishedAt: new Date(Date.now() - 3600000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1518020382113-a7e8fc38eac9?w=800&q=80",
      url: "#"
    },
    {
      title: "The Quiet Revival of Independent Bookshops Across Small-Town America",
      description: "Against all odds, independent bookstores are flourishing in small communities. Owners say the key isn't fighting Amazon — it's becoming a neighborhood living room.",
      author: "Marcus Webb",
      source: { name: "The Atlantic" },
      publishedAt: new Date(Date.now() - 7200000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&q=80",
      url: "#"
    },
    {
      title: "How a Small Village in Japan Is Using Technology to Preserve Ancient Crafts",
      description: "In the mountain village of Wajima, artisans and technologists are working together to document and share 1,200-year-old lacquerware techniques with the rest of the world.",
      author: "Yuki Tanaka",
      source: { name: "Wired Japan" },
      publishedAt: new Date(Date.now() - 10800000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?w=800&q=80",
      url: "#"
    },
    {
      title: "New Study Links Urban Green Spaces to Significantly Lower Anxiety Levels",
      description: "A longitudinal study of 42,000 city residents found that those living within walking distance of parks reported markedly better mental health outcomes — a finding with major policy implications.",
      author: "Priya Nair",
      source: { name: "The Guardian" },
      publishedAt: new Date(Date.now() - 18000000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80",
      url: "#"
    },
    {
      title: "The Surprising Comeback of Letter Writing in the Digital Age",
      description: "From pen pal clubs to corporate pen initiatives, handwritten letters are having an unexpected cultural renaissance — and psychologists think they understand exactly why.",
      author: "Sylvia Holt",
      source: { name: "BBC Culture" },
      publishedAt: new Date(Date.now() - 25200000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1586769852044-692d6e3703f0?w=800&q=80",
      url: "#"
    },
    {
      title: "Engineers Build Bridge Using Only Locally Sourced Bamboo — And It's Stunning",
      description: "A team of civil engineers in Vietnam has completed a 120-meter pedestrian bridge built entirely from bamboo, redefining what sustainable infrastructure can look like in the modern world.",
      author: "Linh Pham",
      source: { name: "Fast Company" },
      publishedAt: new Date(Date.now() - 32400000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&q=80",
      url: "#"
    },
    {
      title: "Amateur Astronomer in Arizona Spots Previously Unknown Asteroid",
      description: "Using a backyard telescope and open-source tracking software, 67-year-old retired teacher Harold Osei confirmed the first asteroid discovery by a private citizen in five years.",
      author: "Tom Reeves",
      source: { name: "Sky & Telescope" },
      publishedAt: new Date(Date.now() - 43200000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1446941611757-91d2c3bd3d45?w=800&q=80",
      url: "#"
    },
    {
      title: "Community Kitchen in Detroit Turns Food Waste Into 1,000 Meals a Week",
      description: "What started as a weekend project by three friends has grown into a thriving nonprofit that intercepts surplus groceries from local restaurants and schools, feeding thousands.",
      author: "Aaliyah Brown",
      source: { name: "Civil Eats" },
      publishedAt: new Date(Date.now() - 54000000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=800&q=80",
      url: "#"
    },
    {
      title: "Why the World's Most Liveable Cities All Have One Thing in Common",
      description: "After analyzing 80 cities across six continents, urban researchers found a single consistent thread among the places people most want to call home. The answer might surprise you.",
      author: "Elena Vasquez",
      source: { name: "CityLab" },
      publishedAt: new Date(Date.now() - 72000000).toISOString(),
      urlToImage: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=800&q=80",
      url: "#"
    }
  ];

  if (!append) allArticles = mockArticles;
  else allArticles = allArticles.concat(mockArticles.slice(0, 3));

  render(append);
  loadMoreBtn.disabled = false;
  loadMoreBtn.style.display = append ? 'none' : 'inline-block';
}
