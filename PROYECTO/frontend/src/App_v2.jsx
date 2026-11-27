import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './App.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function todayLong() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}
function Icon({ n }) {
  return <span className="material-icons">{n}</span>;
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
            <div className="logo"><Icon n="fitness_center" /> Rutina</div>
            <h2>Planificá tu rutina,<br />registrá tus ejercicios.</h2>
            <p>Crea rutinas por día y carga ejercicios con reps y peso.</p>
            <ul>
              <li><Icon n="assignment" /> Planificar rutina (nombre + fecha)</li>
              <li><Icon n="fitness_center" /> Registrar ejercicios: nombre, reps, peso</li>
              <li><Icon n="bar_chart" /> Total de kg y ejercicios por rutina</li>
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
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? '...' : mode === 'login' ? 'Entrar →' : 'Crear cuenta'}</button>
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
          <span className="logo"><Icon n="fitness_center" /> Rutina</span>
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
            <h1>Hola, {user.username} <Icon n="waving_hand" /></h1>
            <p className="sub">{summary?.totalWorkouts || 0} rutinas · {summary?.totalSets || 0} ejercicios · {Math.round(summary?.volume || 0)} kg en total</p>
          </div>
          <div className="ring" style={{ '--p': progress }}>
            <b>{summary?.totalWorkouts || 0} <Icon n="fitness_center" /></b>
          </div>
        </section>

        {summary && (
          <section className="stats">
            <Stat icon="assignment" n={summary.totalWorkouts} label="rutinas" cls="s1" />
            <Stat icon="repeat" n={summary.totalSets} label="ejercicios" cls="s2" />
            <Stat icon="scale" n={Math.round(summary.volume)} label="kg en total" cls="s3" />
          </section>
        )}

        <form className="newcard" onSubmit={create}>
          <div className="newrow">
            <span className="icon-btn"><Icon n="fitness_center" /></span>
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
            <div className="empty-emoji"><Icon n="fitness_center" /></div>
            <b>Aún no tienes rutinas</b>
            <p>Crea la primera arriba y empieza a agregar ejercicios.</p>
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ icon, n, label, cls }) {
  return (
    <div className={`stat ${cls}`}>
      <span className="stat-icon"><Icon n={icon} /></span>
      <div><b>{n}</b><span>{label}</span></div>
    </div>
  );
}

function WorkoutCard({ w, reload }) {
  const hue = hueFor(w.name);
  const [ex, setEx] = useState({ type: '', reps: '', weight: '' });
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState({ name: w.name, date: w.date });

  useEffect(() => setEditName({ name: w.name, date: w.date }), [w.name, w.date]);

  const del = async () => { if (confirm(`¿Eliminar rutina "${w.name}"?`)) { await api.remove(w.id); await reload(); } };
  const saveEdit = async () => { await api.update(w.id, editName); setEditing(false); await reload(); };
  const addSet = async (e) => {
    e.preventDefault();
    if (!ex.type.trim()) return;
    await api.addExercise(w.id, { type: ex.type, reps: Number(ex.reps) || 0, weight: Number(ex.weight) || 0 });
    setEx({ type: '', reps: '', weight: '' });
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
            <b><Icon n="fitness_center" /> {w.name}</b>
            <div className="chips">
              <span className="chip"><Icon n="calendar_today" /> {w.date}</span>
              <span className="chip"><Icon n="repeat" /> {w.sets} ejercicios</span>
              <span className="chip ghost"><Icon n="scale" /> {Math.round(w.volume)} kg</span>
            </div>
          </>
        )}

        {(w.exercises || []).length > 0 ? (
          <div className="tbl">
            <div className="tr th">
              <div>Ejercicio</div>
              <div>Repeticiones</div>
              <div>Peso (kg)</div>
              <div />
            </div>
            {w.exercises.map((e) => (
              <div key={e.id} className="tr">
                <div className="n">{e.type}</div>
                <div className="c">{e.reps}</div>
                <div className="c">{e.weight}</div>
                <div><button className="btn-del sm" onClick={() => delEx(e.id)} title="Quitar ejercicio"><Icon n="close" /></button></div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mut">Aún no hay ejercicios. Agrega el primero aquí abajo.</p>
        )}

        <form className="ex-form" onSubmit={addSet}>
          <input className="grow" placeholder="Ej: Sentadilla" value={ex.type} onChange={(e) => setEx({ ...ex, type: e.target.value })} />
          <input className="qty" type="number" min="0" title="reps" placeholder="10" value={ex.reps} onChange={(e) => setEx({ ...ex, reps: e.target.value })} />
          <span className="mut">reps</span>
          <input className="qty" type="number" min="0" step="0.5" title="peso kg" placeholder="40" value={ex.weight} onChange={(e) => setEx({ ...ex, weight: e.target.value })} />
          <span className="mut">kg</span>
          <button className="btn-primary" type="submit"><Icon n="add" /> Ejercicio</button>
        </form>
      </div>
      <div className="habit-act">
        <button className="btn-ghost" onClick={() => setEditing(!editing)} title="Editar"><Icon n="edit" /></button>
        <button className="btn-del" onClick={del} title="Eliminar"><Icon n="close" /></button>
      </div>
    </div>
  );
}
