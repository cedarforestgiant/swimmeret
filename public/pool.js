async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('API error');
  return res.json();
}

function renderPool(aggregate) {
  const pool = aggregate.pool;
  document.getElementById('pool-name').textContent = pool.name;
  document.getElementById('pool-progress').textContent = `${aggregate.totals.pledged_seats} / ${pool.threshold_seats} seats pledged`;
  const percent = Math.min(100, Math.round((aggregate.totals.pledged_seats / pool.threshold_seats) * 100));
  document.getElementById('pool-progress-bar').style.width = `${percent}%`;

  const ladderEl = document.getElementById('threshold-ladder');
  ladderEl.innerHTML = '';
  [
    `${pool.threshold_seats} seats -> baseline terms + $/seat target`,
    `${pool.next_threshold_seats} seats -> priority lane + better terms`
  ].forEach(text => {
    const div = document.createElement('div');
    div.className = 'ladder-item';
    div.textContent = text;
    ladderEl.appendChild(div);
  });

  const termsList = document.getElementById('terms-list');
  termsList.innerHTML = '';
  pool.target_terms.forEach(term => {
    const li = document.createElement('li');
    li.textContent = term;
    termsList.appendChild(li);
  });

  const statsEl = document.getElementById('pool-stats');
  statsEl.textContent = `Pledged seats: ${aggregate.totals.pledged_seats} | Verified seats: ${aggregate.totals.verified_seats} | Builders: ${aggregate.totals.pledge_count}`;

  const urgency = aggregate.urgency_distribution;
  const urgencyText = `Today: ${urgency.today} | This week: ${urgency['this week']} | This month: ${urgency['this month']}`;
  document.getElementById('urgency-stats').textContent = urgencyText;
}

async function init() {
  const slug = window.location.pathname.split('/')[2];
  if (!slug) return;
  const data = await apiGet(`/api/pools/slug/${slug}`);
  renderPool(data);
}

init();
