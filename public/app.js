let allDeals = [];
let currentFilter = 'ALL';

// Load deals and analytics on page load
async function load() {
  try {
    const [dealsRes, statsRes] = await Promise.all([
      fetch('/api/deals'),
      fetch('/api/analytics')
    ]);

    allDeals = await dealsRes.json();
    const stats = await statsRes.json();

    // Update statistics
    document.getElementById('stTotal').textContent = stats.totalDeals;
    document.getElementById('stActive').textContent = stats.activeDeals;
    document.getElementById('stClicks').textContent = stats.totalClicks;

    renderGrid();
  } catch (error) {
    console.error('Error loading data:', error);
    document.getElementById('dealsGrid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; color: #dc2626;">Error loading deals. Please refresh the page.</p>';
  }
}

// Filter deals by category or store
function filterDeals(category, btn) {
  currentFilter = category;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  
  renderGrid();
}

// Render the deals grid
function renderGrid() {
  let filtered = allDeals;

  // Apply filters
  if (currentFilter === 'Amazon') {
    filtered = allDeals.filter(d => d.store === 'Amazon');
  } else if (currentFilter !== 'ALL') {
    filtered = allDeals.filter(d => d.category === currentFilter);
  }

  // Remove expired deals from display
  filtered = filtered.filter(d => !d.isExpired);

  if (filtered.length === 0) {
    document.getElementById('dealsGrid').innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8;">No active deals in this category. Click "Sync Now" to refresh.</p>';
    return;
  }

  // Generate HTML for each deal
  document.getElementById('dealsGrid').innerHTML = filtered.map(d => `
    <div class="card ${d.isExpired ? 'expired' : ''}">
      ${d.isExpired ? '<span class="badge-expired">Expired</span>' : ''}
      ${d.discountPercentage > 0 ? `<span class="badge-discount">${d.discountPercentage}% OFF</span>` : ''}
      <img src="${d.imageUrl}" class="card-image" alt="${d.title}" onerror="this.src='https://via.placeholder.com/300'" />
      <div class="card-meta">
        <span>🏪 ${d.store}</span>
        <span>•</span>
        <span>${d.category}</span>
      </div>
      <h4 class="card-title">${d.title}</h4>
      <div class="card-price">
        <span class="offer">₹${d.offerPrice.toLocaleString('en-IN')}</span>
        <span class="original">₹${d.originalPrice.toLocaleString('en-IN')}</span>
        <span class="discount">${d.discountPercentage}% OFF</span>
      </div>
      <a href="${d.affiliateUrl}" target="_blank" onclick="trackClick('${d.id}')" class="card-link">
        ${d.isExpired ? 'Expired' : 'Get Deal ➔'}
      </a>
    </div>
  `).join('');
}

// Track deal clicks
async function trackClick(id) {
  try {
    await fetch(`/api/deals/${id}/click`, { method: 'POST' });
  } catch (error) {
    console.error('Error tracking click:', error);
  }
}

// Trigger manual sync
async function triggerSync() {
  const statusEl = document.getElementById('status');
  const syncBtn = event.target;
  
  syncBtn.disabled = true;
  statusEl.textContent = '🔄 Syncing Amazon, Snitch, Campus Shoes, boAt, Souled Store & Noise...';
  syncBtn.style.opacity = '0.6';

  try {
    const response = await fetch('/api/sync-now', { method: 'POST' });
    const data = await response.json();
    
    statusEl.textContent = `✅ ${data.message}`;
    
    // Reload deals after sync
    setTimeout(() => load(), 1000);
  } catch (error) {
    statusEl.textContent = '❌ Sync failed. Please try again.';
    console.error('Sync error:', error);
  } finally {
    syncBtn.disabled = false;
    syncBtn.style.opacity = '1';
  }
}

// Load data on page load
window.addEventListener('DOMContentLoaded', load);

// Refresh data every 5 minutes
setInterval(load, 5 * 60 * 1000);
