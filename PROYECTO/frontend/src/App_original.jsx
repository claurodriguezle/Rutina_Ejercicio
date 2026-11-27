import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './App.css';

const TIPOS = ['Pecho', 'Espalda', 'Pierna', 'Hombro', 'Bíceps', 'Tríceps', 'Abdomen', 'Cardio', 'Otro'];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function todayLong() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}
function hueFor(name) {
  let h = 0;
  for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [workouts, setWorkouts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState({ username: '', password: '' });
  const [mode, setMode] = useState('login');
  const [nw, setNw] = useState({ name: '', date: todayISO() });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    try {
      const [w, s] = await Promise.all([api.list(), api.summary()]);
      setWorkouts(w);
      setSummary(s);
    } catch (e) { setErr(e.message); }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const progress = useMemo(() => {
    if (!summary || !summary.totalWorkouts) return 0;
    return Math.min(100, summary.totalWorkouts * 10);
  }, [summary]);

  const auth = async (e) => {
    e.preventDefault();
    setErr('');
    setLoading(true);
    try {
      const fn = mode === 'login' ? api.login : api.register;
      const d = await fn(form.username, form.password);
      localStorage.setItem('token', d.token);
      localStorage.setItem('user', JSON.stringify(d.user));
      setUser(d.user);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    setWorkouts([]);
  };

  const create = async (e) => {
    e.preventDefault();
    if (!nw.name.trim()) return;
    setErr('');
    try {
      await api.create({ name: nw.name, date: nw.date || todayISO() });
      setNw({ name: '', date: todayISO() });
      await load();
    } catch (e) { setErr(e.message); }
  };

  if (!user) {
    return (
      <div className="page auth-page">
        <div className="blob b1" /><div className="blob b2" />
        <div className="auth-card">
          <div className="auth-side">
            <div className="logo">💪 Rutina</div>
            <h2>Planifica tu rutina,<br />registra tus sets.</h2>
            <p>Crea rutinas por día y carga ejercicios con reps y peso.</p>
            <ul>
              <li>📋 Planifica tu rutina (nombre + fecha)</li>
              <li>🏋️ Registra tus sets: tipo, reps, peso</li>
              <li>📊 Volumen total y sets por rutina</li>
            </ul>
          </div>
          <div className="auth-form">
            <div className="pill-tabs">
              <button className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>Entrar</button>
              <button className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>Crear cuenta</button>
            </div>
            <form onSubmit={auth}>
              <label>Usuario<input placeholder="ej. luis" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></label>
              <label>Contraseña<input placeholder="••••" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? '...' : mode === 'login' ? 'Entrar →' : 'Crear cuenta ✨'}</button>
            </form>
            {err && <p className="err">{err}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="blob b1" /><div className="blob b2" />
      <nav className="topbar">
        <div className="topbar-in">
          <span className="logo">💪 Rutina</span>
          <div className="userbox">
            <span className="avatar">{user.username[0]?.toUpperCase()}</span>
            <span>{user.username}</span>
            <button className="btn-ghost" onClick={logout}>Salir</button>
          </div>
        </div>
      </nav>

      <main className="wrap">
        <section className="hero">
          <div>
            <p className="date">{todayLong()}</p>
            <h1>Hola, {user.username} 👋</h1>
            <p className="sub">{summary?.totalWorkouts || 0} rutinas · {summary?.totalSets || 0} sets · {Math.round(summary?.volume || 0)} kg vol.</p>
          </div>
          <div className="ring" style={{ '--p': progress }}>
            <b>{summary?.totalWorkouts || 0} 🏋️</b>
          </div>
        </section>

        {summary && (
          <section className="stats">
            <Stat icon="📋" n={summary.totalWorkouts} label="rutinas" cls="s1" />
            <Stat icon="🔁" n={summary.totalSets} label="sets" cls="s2" />
            <Stat icon="⚖️" n={Math.round(summary.volume)} label="kg volumen" cls="s3" />
          </section>
        )}

        <form className="newcard" onSubmit={create}>
          <div className="newrow">
            <span className="icon-btn">💪</span>
            <input className="grow" placeholder="＋ Nueva rutina: Tren superior, Pierna, Full body..." value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
            <input type="date" value={nw.date} onChange={(e) => setNw({ ...nw, date: e.target.value })} />
            <button className="btn-primary" type="submit">Añadir</button>
          </div>
        </form>
        {err && <p className="err">{err}</p>}

        <section className="grid">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} w={w} reload={load} />
          ))}
        </section>
        {workouts.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🏋️</div>
            <b>Aún no tienes rutinas</b>
            <p>Crea la primera arriba y empieza a registrar sets.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, n, label, cls }) {
  return (
    <div className={`stat ${cls}`}>
      <span className="stat-icon">{icon}</span>
      <div><b>{n}</b><span>{label}</span></div>
    </div>
  );
}

function WorkoutCard({ w, reload }) {
  const hue = hueFor(w.name);
  const [ex, setEx] = useState({ type: 'Pecho', reps: 10, weight: 20 });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState({ name: w.name, date: w.date });

  useEffect(() => setEditName({ name: w.name, date: w.date }), [w.name, w.date]);

  const del = async () => { if (confirm(`¿Eliminar rutina "${w.name}"?`)) { await api.remove(w.id); await reload(); } };
  const saveEdit = async () => { await api.update(w.id, editName); setEditing(false); await reload(); };
  const addSet = async (e) => {
    e.preventDefault();
    if (!ex.type.trim()) return;
    await api.addExercise(w.id, { type: ex.type, reps: Number(ex.reps) || 0, weight: Number(ex.weight) || 0 });
    await reload();
  };
  const delEx = async (id) => { await api.removeExercise(id); await reload(); };

  return (
    <div className="habit" style={{ '--hue': hue }}>
      <div className="habit-mid">
        {editing ? (
          <div className="newrow">
            <input className="grow" value={editName.name} onChange={(e) => setEditName({ ...editName, name: e.target.value })} />
            <input type="date" value={editName.date} onChange={(e) => setEditName({ ...editName, date: e.target.value })} />
            <button className="btn-check" type="button" onClick={saveEdit}>Guardar</button>
            <button className="btn-ghost" type="button" onClick={() => setEditing(false)}>Cancelar</button>
          </div>
        ) : (
          <>
            <b>🏋️ {w.name}</b>
            <div className="chips">
              <span className="chip">📅 {w.date}</span>
              <span className="chip">🔁 {w.sets} sets</span>
              <span className="chip ghost">⚖️ {Math.round(w.volume)} kg</span>
            </div>
          </>
        )}

        <div className="ex-list">
          {(w.exercises || []).map((e) => (
            <div key={e.id} className="ex-row">
              <span className="ex-type">{e.type}</span>
              <span className="ex-meta">{e.reps} reps × {e.weight} kg</span>
              <span className="ex-vol">= {Math.round(Number(e.reps) * Number(e.weight))} kg</span>
              <button className="btn-del" onClick={() => delEx(e.id)} title="Quitar set">✕</button>
            </div>
          ))}
          {(w.exercises || []).length === 0 && <p className="mut">Sin sets todavía. Registra el primero abajo.</p>}
        </div>

        <form className="ex-form" onSubmit={addSet}>
          <select value={ex.type} onChange={(e) => setEx({ ...ex, type: e.target.value })}>
            {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="qty" type="number" min="0" title="reps" value={ex.reps} onChange={(e) => setEx({ ...ex, reps: e.target.value })} />
          <span className="mut">reps</span>
          <input className="qty" type="number" min="0" step="0.5" title="peso kg" value={ex.weight} onChange={(e) => setEx({ ...ex, weight: e.target.value })} />
          <span className="mut">kg</span>
          <button className="btn-primary" type="submit">＋ Set</button>
        </form>
      </div>
      <div className="habit-act">
        <button className="btn-ghost" onClick={() => setEditing(!editing)} title="Editar">✎</button>
        <button className="btn-del" onClick={del} title="Eliminar">✕</button>
      </div>
    </div>
  );
}
