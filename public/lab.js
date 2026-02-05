async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error('API error');
  return res.json();
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
}

function renderLab(data) {
  document.getElementById('lab-pool-name').textContent = data.pool.name;
  document.getElementById('lab-seat-total').textContent = `${data.totals.pledged_seats} seats pledged (${data.totals.verified_seats} verified)`;
  document.getElementById('lab-implied').textContent = `Implied monthly: ${formatCurrency(data.implied_monthly)}`;

  const workload = data.workload_profile;
  document.getElementById('lab-workload').innerHTML = `
    <div>Avg run count (30d): <strong>${workload.avg_run_count}</strong></div>
    <div>Avg peak concurrency: <strong>${workload.avg_peak_concurrency}</strong></div>
    <div>Provider usage (pool): <strong>${workload.provider_usage_percent}%</strong></div>
  `;

  const terms = document.getElementById('lab-terms');
  terms.innerHTML = '';
  data.target_terms.forEach(term => {
    const li = document.createElement('li');
    li.textContent = term;
    terms.appendChild(li);
  });

  document.getElementById('lab-counterparty').textContent = data.counterparty;

  const seatHist = data.histogram;
  document.getElementById('lab-seat-hist').textContent = `1-3 seats: ${seatHist['1-3']} | 4-12 seats: ${seatHist['4-12']} | 13+ seats: ${seatHist['13+']}`;

  const urgency = data.urgency_distribution;
  document.getElementById('lab-urgency').textContent = `Today: ${urgency.today} | This week: ${urgency['this week']} | This month: ${urgency['this month']}`;

  document.getElementById('lab-guardrails').textContent = `${data.guardrail_adoption}% of builders applied guardrails`;
}

async function init() {
  const parts = window.location.pathname.split('/');
  const poolId = parts[3];
  if (!poolId) return;
  const data = await apiGet(`/api/lab/pools/${poolId}`);
  renderLab(data);
}

init();
