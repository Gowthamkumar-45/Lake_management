const BASE = 'http://localhost:8000/api'

function getToken() {
  return localStorage.getItem('wbms_token')
}

async function request(path, options = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Token ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.error || err.detail || 'Request failed'), { status: res.status })
  }
  if (res.status === 204) return null
  return res.json()
}

// ── Auth ─────────────────────────────────────────────────────────────────────
export const auth = {
  login: (username, password) =>
    request('/auth/login/', { method: 'POST', body: JSON.stringify({ username, password }) }),
  logout: () => request('/auth/logout/', { method: 'POST' }),
  me: () => request('/auth/me/'),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const stats = {
  get: () => request('/stats/'),
  recentUpdates: () => request('/recent-updates/'),
}

// ── Water Bodies ──────────────────────────────────────────────────────────────
export const waterBodies = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/water-bodies/${q ? '?' + q : ''}`)
  },
  get: (id) => request(`/water-bodies/${id}/`),
  create: (data) => request('/water-bodies/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/water-bodies/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/water-bodies/${id}/`, { method: 'DELETE' }),
}

// ── Maintenance ───────────────────────────────────────────────────────────────
export const maintenance = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/maintenance/${q ? '?' + q : ''}`)
  },
  create: (data) => request('/maintenance/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/maintenance/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Work Entries ──────────────────────────────────────────────────────────────
export const workEntries = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/work-entries/${q ? '?' + q : ''}`)
  },
  create: (data) => request('/work-entries/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/work-entries/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Photos ────────────────────────────────────────────────────────────────────
export const photos = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/photos/${q ? '?' + q : ''}`)
  },
}

// ── Officers ──────────────────────────────────────────────────────────────────
export const officers = {
  list: () => request('/officers/'),
  create: (data) => request('/officers/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/officers/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id) => request(`/officers/${id}/`, { method: 'DELETE' }),
}

// ── Renovation Resources ──────────────────────────────────────────────────────
function renoResource(path) {
  return {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/${path}/${q ? '?' + q : ''}`)
    },
    create: (data) => request(`/${path}/`, { method: 'POST', body: JSON.stringify(data) }),
    delete: (id) => request(`/${path}/${id}/`, { method: 'DELETE' }),
  }
}

export const workforce = renoResource('workforce')
export const machines  = renoResource('machines')
export const funds     = renoResource('funds')

// ── Water Level History ───────────────────────────────────────────────────────
export const waterLevelHistory = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/water-level-history/${q ? '?' + q : ''}`)
  },
  create: (data) => request('/water-level-history/', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Assignments ───────────────────────────────────────────────────────────────
export const assignments = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/assignments/${q ? '?' + q : ''}`)
  },
  create: (data) => request('/assignments/', { method: 'POST', body: JSON.stringify(data) }),
  delete: (id) => request(`/assignments/${id}/`, { method: 'DELETE' }),
}

// ── Notifications ─────────────────────────────────────────────────────────────
export const notifications = {
  list: () => request('/notifications/'),
  markRead: (id) => request(`/notifications/${id}/mark_read/`, { method: 'POST' }),
  markAllRead: () => request('/notifications/mark_all_read/', { method: 'POST' }),
}

// ── Audit Log ─────────────────────────────────────────────────────────────────
export const auditLog = {
  list: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/audit-logs/${q ? '?' + q : ''}`)
  },
}

// ── Inflow / Outflow Sources ──────────────────────────────────────────────────
function crudResource(path) {
  return {
    list: (params = {}) => {
      const q = new URLSearchParams(params).toString()
      return request(`/${path}/${q ? '?' + q : ''}`)
    },
    get: (id) => request(`/${path}/${id}/`),
    create: (data) => request(`/${path}/`, { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/${path}/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id) => request(`/${path}/${id}/`, { method: 'DELETE' }),
  }
}
export const inflowSources  = crudResource('inflow-sources')
export const outflowSources = crudResource('outflow-sources')

// ── Geography ─────────────────────────────────────────────────────────────────
export const geo = {
  taluks: () => request('/taluks/'),
  localBodies: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return request(`/local-bodies/${q ? '?' + q : ''}`)
  },
}
