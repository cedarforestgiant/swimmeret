const state = {
  userId: localStorage.getItem('oc_user_id') || null,
  poolId: null,
  poolSlug: null,
  verification: null
};

const sections = {
  intake: document.getElementById('section-intake'),
  plan: document.getElementById('section-plan'),
  pool: document.getElementById('section-pool')
};

const steps = Array.from(document.querySelectorAll('.step'));

function setStep(stepName) {
  Object.values(sections).forEach(section => section.classList.remove('active'));
  if (sections[stepName]) sections[stepName].classList.add('active');

  steps.forEach(step => {
    step.classList.toggle('active', step.dataset.step === stepName);
  });
}

async function api(path, payload) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  return res.json();
}

function updateHeaderBadge(text, tone = '') {
  const badge = document.getElementById('header-badge');
  badge.textContent = text;
  badge.className = `badge ${tone}`.trim();
}

function updateVerificationUI(score) {
  const block = document.getElementById('verification-block');
  const tierLabel = score.tier === 'power'
    ? 'Power Builder'
    : score.tier === 'verified'
      ? 'Verified Builder'
      : 'Unverified';

  const badgeClass = score.tier === 'power'
    ? 'badge power'
    : score.tier === 'verified'
      ? 'badge'
      : 'badge unverified';

  block.innerHTML = `
    <div class="${badgeClass}">${tierLabel} ${score.tier !== 'unverified' ? 'OK' : ''}</div>
    <p class="subhead">Verification score: ${score.score}</p>
    <div class="subhead">${score.reasons.join(' | ')}</div>
  `;

  const headerText = score.tier === 'unverified' ? 'Unverified' : `${tierLabel}`;
  updateHeaderBadge(headerText, score.tier === 'power' ? 'power' : score.tier === 'verified' ? '' : 'unverified');
}

function renderPoolAggregate(aggregate) {
  const pool = aggregate.pool;
  const totals = aggregate.totals;

  document.getElementById('pool-name').textContent = pool.name;
  document.getElementById('pool-progress').textContent = `${totals.pledged_seats} / ${pool.threshold_seats} seats pledged`;

  const percent = Math.min(100, Math.round((totals.pledged_seats / pool.threshold_seats) * 100));
  document.getElementById('pool-progress-bar').style.width = `${percent}%`;

  const ladderEl = document.getElementById('threshold-ladder');
  ladderEl.innerHTML = '';
  const ladderItems = [
    `${pool.threshold_seats} seats -> baseline terms + $/seat target`,
    `${pool.next_threshold_seats} seats -> priority lane + better terms`
  ];
  ladderItems.forEach(text => {
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
}

function setShareLink(poolSlug) {
  const shareInput = document.getElementById('share-link');
  shareInput.value = `${window.location.origin}/p/${poolSlug}`;
}

function generateReferralCode(userId) {
  if (!userId) return 'OC-NEW';
  return `OC-${userId.slice(-4).toUpperCase()}`;
}

const intakeForm = document.getElementById('intake-form');
intakeForm.addEventListener('submit', async event => {
  event.preventDefault();
  intakeForm.querySelector('button').disabled = true;

  const payload = {
    userId: state.userId,
    incident_type: document.getElementById('incidentType').value,
    provider: document.getElementById('provider').value,
    seats_band: document.getElementById('seatsBand').value,
    agents_band: document.getElementById('agentsBand').value,
    urgency: document.getElementById('urgency').value,
    consent_telemetry: document.getElementById('consent').value === 'true'
  };

  try {
    const incident = await api('/api/stability/incidents', payload);
    state.userId = incident.userId;
    localStorage.setItem('oc_user_id', state.userId);

    await api('/api/stability/usage-snapshot', {
      userId: state.userId,
      window_days: 30,
      provider: payload.provider,
      consent_telemetry: payload.consent_telemetry
    });

    const verification = await api('/api/stability/verify', { userId: state.userId });
    state.verification = verification;
    updateVerificationUI(verification);
    setStep('plan');
  } catch (err) {
    updateHeaderBadge('Error - retry', 'unverified');
  } finally {
    intakeForm.querySelector('button').disabled = false;
  }
});

const applyGuardrailsBtn = document.getElementById('apply-guardrails');
applyGuardrailsBtn.addEventListener('click', async () => {
  if (!state.userId) return;
  applyGuardrailsBtn.disabled = true;

  const guardrails = {
    cap_concurrency: document.getElementById('guard-cap').checked,
    jitter_backoff: document.getElementById('guard-backoff').checked,
    loop_limiter: document.getElementById('guard-loop').checked,
    cache_dedupe: document.getElementById('guard-cache').checked
  };

  try {
    await api('/api/guardrails/apply', { userId: state.userId, guardrails });
    applyGuardrailsBtn.textContent = 'Guardrails Applied';
  } catch (err) {
    applyGuardrailsBtn.textContent = 'Retry Guardrails';
  } finally {
    setTimeout(() => {
      applyGuardrailsBtn.disabled = false;
    }, 800);
  }
});

const joinPoolBtn = document.getElementById('join-pool');
joinPoolBtn.addEventListener('click', async () => {
  if (!state.userId) return;
  joinPoolBtn.disabled = true;
  try {
    const join = await api('/api/pools/join', {
      userId: state.userId,
      provider: document.getElementById('provider').value,
      pool_type: 'code_agents'
    });
    state.poolId = join.pool.id;
    state.poolSlug = join.pool.slug;

    const aggregate = await apiGet(`/api/pools/${state.poolId}`);
    renderPoolAggregate(aggregate);
    setShareLink(state.poolSlug);
    document.getElementById('ref-code').textContent = `Your referral code: ${generateReferralCode(state.userId)}`;
    document.getElementById('lab-link').href = `/lab/pools/${state.poolId}`;
    setStep('pool');
  } catch (err) {
    joinPoolBtn.textContent = 'Join Failed';
  } finally {
    joinPoolBtn.disabled = false;
  }
});

const pledgeForm = document.getElementById('pledge-form');
pledgeForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (!state.userId || !state.poolId) return;

  const payload = {
    userId: state.userId,
    seats_intended: Number(document.getElementById('pledgeSeats').value || 1),
    wtp_band: document.getElementById('wtpBand').value,
    contact: document.getElementById('contact').value,
    referral_code_used: document.getElementById('referral').value
  };

  try {
    const result = await api(`/api/pools/${state.poolId}/pledge`, payload);
    renderPoolAggregate(result.aggregate);
    const confirm = document.getElementById('pledge-confirm');
    confirm.textContent = 'Pledge saved. You are now included in the demand book.';
    confirm.classList.remove('hidden');
    setShareLink(state.poolSlug);
  } catch (err) {
    const confirm = document.getElementById('pledge-confirm');
    confirm.textContent = 'Pledge failed. Please retry.';
    confirm.classList.remove('hidden');
  }
});

const copyBtn = document.getElementById('copy-link');
copyBtn.addEventListener('click', async () => {
  const shareInput = document.getElementById('share-link');
  if (!shareInput.value) return;
  try {
    await navigator.clipboard.writeText(shareInput.value);
    copyBtn.textContent = 'Copied';
  } catch (err) {
    copyBtn.textContent = 'Copy';
  }
});
