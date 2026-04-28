const backendUrl = (window.INSIGHTA_BACKEND_URL || localStorage.getItem('INSIGHTA_BACKEND_URL') || 'http://localhost:8080').replace(/\/$/, '');

const state = {
  user: null,
  page: 1,
  limit: 10,
  totalPages: 1,
  mode: 'list',
  query: ''
};

const $ = (id) => document.getElementById(id);
const els = {
  loginBtn: $('loginBtn'),
  loginBtnLabel: $('loginBtnLabel'),
  heroLoginBtn: $('heroLoginBtn'),
  logoutBtn: $('logoutBtn'),
  dashboardTab: $('dashboardTab'),
  profilesTab: $('profilesTab'),
  searchTab: $('searchTab'),
  accountTab: $('accountTab'),
  signedOut: $('signedOut'),
  appShell: $('appShell'),
  dashboardView: $('dashboardView'),
  profilesView: $('profilesView'),
  accountView: $('accountView'),
  sessionLabel: $('sessionLabel'),
  roleBadge: $('roleBadge'),
  userAvatar: $('userAvatar'),
  profilesBody: $('profilesBody'),
  filters: $('filters'),
  searchInput: $('searchInput'),
  searchBtn: $('searchBtn'),
  clearBtn: $('clearBtn'),
  exportBtn: $('exportBtn'),
  prevBtn: $('prevBtn'),
  nextBtn: $('nextBtn'),
  pageLabel: $('pageLabel'),
  resultCount: $('resultCount'),
  adminPanel: $('adminPanel'),
  createForm: $('createForm'),
  metricProfiles: $('metricProfiles'),
  metricPage: $('metricPage'),
  metricRole: $('metricRole'),
  accountUsername: $('accountUsername'),
  accountEmail: $('accountEmail'),
  accountRole: $('accountRole'),
  profileDialog: $('profileDialog'),
  detailName: $('detailName'),
  detailBody: $('detailBody'),
  closeDetailBtn: $('closeDetailBtn'),
  toast: $('toast')
};

els.loginBtn.addEventListener('click', login);
els.heroLoginBtn.addEventListener('click', login);
els.logoutBtn.addEventListener('click', logout);
els.dashboardTab.addEventListener('click', () => showView('dashboard'));
els.profilesTab.addEventListener('click', () => showView('profiles'));
els.searchTab.addEventListener('click', () => {
  showView('profiles');
  els.searchInput.focus();
});
els.accountTab.addEventListener('click', () => showView('account'));
els.closeDetailBtn.addEventListener('click', () => els.profileDialog.close());
els.filters.addEventListener('submit', (event) => {
  event.preventDefault();
  state.page = 1;
  state.mode = 'list';
  loadProfiles();
});
els.searchBtn.addEventListener('click', () => {
  state.page = 1;
  state.mode = 'search';
  state.query = els.searchInput.value.trim();
  loadProfiles();
});
els.clearBtn.addEventListener('click', () => {
  els.searchInput.value = '';
  state.mode = 'list';
  state.query = '';
  state.page = 1;
  els.filters.reset();
  loadProfiles();
});
els.exportBtn.addEventListener('click', exportCsv);
els.prevBtn.addEventListener('click', () => {
  if (state.page > 1) {
    state.page -= 1;
    loadProfiles();
  }
});
els.nextBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) {
    state.page += 1;
    loadProfiles();
  }
});
els.createForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(els.createForm);
  await api('/api/profiles', {
    method: 'POST',
    body: JSON.stringify({ name: form.get('name') })
  });
  els.createForm.reset();
  toast('Profile created');
  await loadProfiles();
});

boot();

async function boot() {
  try {
    state.user = await api('/api/v1/auth/me');
    renderSession();
    await loadProfiles();
  } catch {
    state.user = null;
    renderSession();
  }
}

function login() {
  if (state.user) return;
  window.location.href = `${backendUrl}/api/v1/auth/github/start?client=web`;
}

async function logout() {
  const response = await fetch(`${backendUrl}/api/v1/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders()
  });
  if (!response.ok) {
    toast('Sign out failed');
    return;
  }

  state.user = null;
  state.page = 1;
  state.totalPages = 1;
  els.profilesBody.innerHTML = '';
  els.metricProfiles.textContent = '0';
  els.metricPage.textContent = '1';
  els.metricRole.textContent = '-';
  els.resultCount.textContent = '0 profiles';
  els.pageLabel.textContent = 'Page 1';
  renderSession();
}

function renderSession() {
  const signedIn = Boolean(state.user);
  const role = state.user?.role?.toLowerCase() || '';
  els.signedOut.hidden = signedIn;
  els.appShell.hidden = !signedIn;
  els.loginBtn.hidden = false;
  els.loginBtn.classList.toggle('is-signed-in', signedIn);
  els.loginBtn.setAttribute('aria-disabled', signedIn ? 'true' : 'false');
  els.loginBtn.title = signedIn ? `Signed in as ${state.user.github_username}` : 'Sign in with GitHub';
  els.loginBtnLabel.textContent = signedIn ? 'Signed in' : 'Sign in';
  els.loginBtn.querySelector('.loginbtn-icon-github').hidden = signedIn;
  els.loginBtn.querySelector('.loginbtn-icon-check').hidden = !signedIn;
  els.logoutBtn.hidden = !signedIn;
  [els.dashboardTab, els.profilesTab, els.searchTab, els.accountTab].forEach((button) => {
    button.hidden = !signedIn;
  });
  els.adminPanel.hidden = !signedIn || role !== 'admin';
  els.sessionLabel.textContent = signedIn
    ? `Signed in as ${state.user.github_username}`
    : 'Signed out';
  if (els.roleBadge) {
    els.roleBadge.hidden = !signedIn;
    if (signedIn) {
      els.roleBadge.textContent = role;
      els.roleBadge.dataset.role = role;
    }
  }
  if (els.userAvatar) {
    if (signedIn && state.user.avatar_url) {
      els.userAvatar.src = state.user.avatar_url;
      els.userAvatar.alt = state.user.github_username || '';
      els.userAvatar.hidden = false;
    } else {
      els.userAvatar.hidden = true;
      els.userAvatar.removeAttribute('src');
    }
  }
  if (signedIn) {
    els.metricRole.textContent = role;
    els.accountUsername.textContent = state.user.github_username;
    els.accountEmail.textContent = state.user.email || 'Not provided';
    els.accountRole.textContent = role;
    showView('dashboard');
  }
}

function showView(view) {
  els.dashboardView.hidden = view !== 'dashboard';
  els.profilesView.hidden = view !== 'profiles';
  els.accountView.hidden = view !== 'account';
  const map = {
    dashboard: els.dashboardTab,
    profiles: els.profilesTab,
    account: els.accountTab
  };
  Object.entries(map).forEach(([key, button]) => {
    button.classList.toggle('is-active', key === view);
  });
  els.searchTab.classList.toggle('is-active', false);
}

async function loadProfiles() {
  const path = state.mode === 'search'
    ? `/api/profiles/search?q=${encodeURIComponent(state.query)}&page=${state.page}&limit=${state.limit}`
    : `/api/profiles${filterQuery()}`;
  const result = await api(path);
  const pagination = normalizePagination(result);
  state.totalPages = pagination.total_pages || 1;
  renderProfiles(result.data, pagination);
}

function normalizePagination(result) {
  if (result.pagination) {
    return result.pagination;
  }

  const totalPages = result.total_pages || 1;
  return {
    page: result.page || 1,
    limit: result.limit || state.limit,
    total: result.total || 0,
    total_pages: totalPages,
    has_next: Boolean(result.links?.next) || (result.page || 1) < totalPages,
    has_previous: Boolean(result.links?.prev) || (result.page || 1) > 1
  };
}

function filterQuery() {
  const form = new FormData(els.filters);
  const params = new URLSearchParams({ page: state.page, limit: state.limit });
  for (const [key, value] of form.entries()) {
    if (String(value).trim()) params.set(key, String(value).trim());
  }
  return `?${params.toString()}`;
}

function exportFilterQuery() {
  const form = new FormData(els.filters);
  const params = new URLSearchParams({ format: 'csv' });
  for (const [key, value] of form.entries()) {
    if (String(value).trim()) params.set(key, String(value).trim());
  }
  return `?${params.toString()}`;
}

function renderProfiles(profiles, pagination) {
  els.profilesBody.innerHTML = '';

  if (!profiles || profiles.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="8">
        <div class="table-empty">
          <div class="icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </div>
          No profiles match the current filters.
        </div>
      </td>
    `;
    els.profilesBody.appendChild(row);
  }

  const isAdmin = state.user?.role?.toLowerCase() === 'admin';
  for (const profile of profiles || []) {
    const initial = (profile.name || '?').trim().charAt(0).toUpperCase();
    const idShort = String(profile.id || '').slice(0, 8);
    const genderPct = Math.round((profile.gender_probability || 0) * 100);
    const countryPct = Math.round((profile.country_probability || 0) * 100);
    const gender = (profile.gender || '').toLowerCase();
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div class="cell-name">
          <span class="avatar" data-gender="${escapeHtml(gender)}">${escapeHtml(initial)}</span>
          <div class="cell-name-text">
            <span class="name-primary">${escapeHtml(profile.name)}</span>
            <span class="name-secondary">${escapeHtml(idShort)}</span>
          </div>
        </div>
      </td>
      <td><span class="badge badge-gender" data-gender="${escapeHtml(gender)}">${escapeHtml(profile.gender)}</span></td>
      <td>${profile.age}</td>
      <td><span class="badge badge-soft">${escapeHtml(profile.age_group)}</span></td>
      <td>
        <span class="country-cell">
          <span class="country-code">${escapeHtml(profile.country_id)}</span>
          <span class="country-name">${escapeHtml(profile.country_name)}</span>
        </span>
      </td>
      <td>
        <div class="probabilities">
          <span class="prob-pill gender" title="Gender confidence">${genderPct}%</span>
          <span class="prob-pill country" title="Country confidence">${countryPct}%</span>
        </div>
      </td>
      <td class="actions"><button class="ghost btn-sm" data-view-id="${profile.id}">View</button></td>
      <td class="actions">${isAdmin ? `<button class="danger" data-id="${profile.id}">Delete</button>` : ''}</td>
    `;
    els.profilesBody.appendChild(row);
  }

  els.profilesBody.querySelectorAll('button[data-id]').forEach((button) => {
    button.addEventListener('click', async () => {
      await api(`/api/profiles/${button.dataset.id}`, { method: 'DELETE' });
      toast('Profile deleted');
      await loadProfiles();
    });
  });
  els.profilesBody.querySelectorAll('button[data-view-id]').forEach((button) => {
    button.addEventListener('click', async () => showProfileDetail(button.dataset.viewId));
  });

  els.resultCount.textContent = `${pagination.total} profiles`;
  els.pageLabel.textContent = `Page ${pagination.page} of ${pagination.total_pages || 1}`;
  els.metricProfiles.textContent = pagination.total;
  els.metricPage.textContent = pagination.page;
  els.prevBtn.disabled = !pagination.has_previous;
  els.nextBtn.disabled = !pagination.has_next;
}

async function showProfileDetail(id) {
  const result = await api(`/api/profiles/${id}`);
  const profile = result.data;
  els.detailName.textContent = profile.name;
  els.detailBody.innerHTML = `
    <dt>Gender</dt><dd>${escapeHtml(profile.gender)} (${Math.round(profile.gender_probability * 100)}%)</dd>
    <dt>Age</dt><dd>${profile.age} · ${escapeHtml(profile.age_group)}</dd>
    <dt>Country</dt><dd>${escapeHtml(profile.country_name)} (${escapeHtml(profile.country_id)})</dd>
    <dt>Created</dt><dd>${escapeHtml(profile.created_at)}</dd>
  `;
  els.profileDialog.showModal();
}

async function exportCsv() {
  const path = state.mode === 'search'
    ? `/api/profiles/export?format=csv&q=${encodeURIComponent(state.query)}`
    : `/api/profiles/export${exportFilterQuery()}`;
  const response = await fetch(`${backendUrl}${path}`, {
    credentials: 'include',
    headers: { ...csrfHeaders(), 'X-API-Version': '1' }
  });
  if (!response.ok) throw new Error(await response.text());
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'profiles.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

async function api(path, options = {}) {
  const headers = {
    ...csrfHeaders(),
    ...(options.headers || {})
  };

  if (path.startsWith('/api/profiles') || path.startsWith('/api/v1/profiles')) {
    headers['X-API-Version'] = '1';
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${backendUrl}${path}`, {
    credentials: 'include',
    ...options,
    headers
  });

  if (response.status === 401) {
    if (options.retryAuth !== false && await refreshSession()) {
      return api(path, { ...options, retryAuth: false });
    }

    state.user = null;
    renderSession();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return response.status === 204 ? null : response.json();
}

async function refreshSession() {
  const response = await fetch(`${backendUrl}/api/v1/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: csrfHeaders()
  });
  return response.ok;
}

function csrfHeaders() {
  const token = document.cookie.split('; ').find((item) => item.startsWith('XSRF-TOKEN='))?.split('=')[1];
  return token ? { 'X-CSRF-TOKEN': decodeURIComponent(token) } : {};
}

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  setTimeout(() => els.toast.classList.remove('show'), 2200);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
