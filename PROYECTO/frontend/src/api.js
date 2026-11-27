const BASE = '';

function headers() {
  const t = localStorage.getItem('token');
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

async function req(path, opts = {}) {
  const r = await fetch(BASE + path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Error');
  return data;
}

export const api = {
  register: (u, p) => req('/api/auth/register', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  login: (u, p) => req('/api/auth/login', { method: 'POST', body: JSON.stringify({ username: u, password: p }) }),
  list: () => req('/api/workouts'),
  create: (b) => req('/api/workouts', { method: 'POST', body: JSON.stringify(b) }),
  update: (id, b) => req(`/api/workouts/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
  remove: (id) => req(`/api/workouts/${id}`, { method: 'DELETE' }),
  addExercise: (id, b) => req(`/api/workouts/${id}/exercises`, { method: 'POST', body: JSON.stringify(b) }),
  updateExercise: (exId, b) => req(`/api/workouts/exercises/${exId}`, { method: 'PUT', body: JSON.stringify(b) }),
  removeExercise: (exId) => req(`/api/workouts/exercises/${exId}`, { method: 'DELETE' }),
  summary: () => req('/api/workouts/stats/summary'),
};
