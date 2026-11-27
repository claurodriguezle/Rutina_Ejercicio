import { useEffect, useMemo, useState } from 'react';
import { api } from './api';
import './App.css';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function todayLong() {
  return new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
}
const DUP_MSG = 'Ya tienes una rutina con ese nombre y fecha. ¿Guardarla de todos modos?';
function isDuplicate(list, name, date, exceptId) {
  const n = name.trim().toLowerCase();
  return list.some((x) => x.id !== exceptId && x.name.trim().toLowerCase() === n && x.date === date);
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
  const [showForm, setShowForm] = useState(false);
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

  const saveNew = async ({ name, date, exercises }) => {
    const d = date || todayISO();
    if (isDuplicate(workouts, name, d) && !confirm(DUP_MSG)) return false;
    const w = await api.create({ name, date: d });
    for (const x of exercises) await api.addExercise(w.id, x);
    await load();
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
            <button className="btn-primary btn-new" onClick={() => setShowForm(true)}><Icon n="add" /> Crear rutina</button>
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

        {err && <p className="err">{err}</p>}

        <section className="grid">
          {workouts.map((w) => (
            <WorkoutCard key={w.id} w={w} reload={load} all={workouts} />
          ))}
        </section>
        {workouts.length === 0 && (
          <div className="empty">
            <div className="empty-emoji"><Icon n="fitness_center" /></div>
            <b>Aún no tienes rutinas</b>
            <p>Toca «Crear rutina», arriba a la derecha, para empezar.</p>
          </div>
        )}
      </main>

      {showForm && <RoutineForm onClose={() => setShowForm(false)} onSave={saveNew} />}
    </div>
  );
}

function RoutineForm({ onClose, onSave }) {
  const [name, setName] = useState('');
  const [date, setDate] = useState(todayISO());
  const [items, setItems] = useState([]);
  const [ex, setEx] = useState({ type: '', reps: '', weight: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    if (!ex.type.trim()) return;
    setItems([...items, { type: ex.type.trim(), reps: Number(ex.reps) || 0, weight: Number(ex.weight) || 0 }]);
    setEx({ type: '', reps: '', weight: '' });
  };
  const onEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  };
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setErr('Escribe el nombre de la rutina'); return; }
    setSaving(true);
    setErr('');
    try {
      const ok = await onSave({ name: name.trim(), date, exercises: items });
      if (ok === false) { setSaving(false); return; }
      onClose();
    } catch (e2) {
      setErr(e2.message);
      setSaving(false);
    }
  };

  return (
    <div className="overlay">
      <div className="modal">
        <div className="modal-head">
          <h2>Nueva rutina</h2>
          <button type="button" className="btn-del" onClick={onClose} title="Cerrar"><Icon n="close" /></button>
        </div>
        <form onSubmit={submit}>
          <div className="newrow">
            <div className="field grow">
              <span className="lbl">Nombre de la rutina</span>
              <input autoFocus placeholder="Ej: Tren superior, Pierna, Full body" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <span className="lbl">Fecha</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <span className="lbl">Ejercicios de la rutina</span>
          {items.length > 0 ? (
            <div className="tbl">
              <div className="tr th">
                <div>Ejercicio</div>
                <div>Repeticiones</div>
                <div>Peso (kg)</div>
                <div />
              </div>
              {items.map((x, i) => (
                <div key={i} className="tr">
                  <div className="n">{x.type}</div>
                  <div className="c">{x.reps}</div>
                  <div className="c">{x.weight}</div>
                  <div><button type="button" className="btn-del sm" onClick={() => setItems(items.filter((_, k) => k !== i))} title="Quitar ejercicio"><Icon n="close" /></button></div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mut">Aún no agregaste ejercicios. Puedes hacerlo ahora o después.</p>
          )}

          <div className="ex-form">
            <input className="grow" placeholder="Ej: Sentadilla" value={ex.type} onChange={(e) => setEx({ ...ex, type: e.target.value })} onKeyDown={onEnter} />
            <input className="qty" type="number" min="0" placeholder="10" title="repeticiones" value={ex.reps} onChange={(e) => setEx({ ...ex, reps: e.target.value })} onKeyDown={onEnter} />
            <span className="mut">reps</span>
            <input className="qty" type="number" min="0" step="0.5" placeholder="40" title="peso kg" value={ex.weight} onChange={(e) => setEx({ ...ex, weight: e.target.value })} onKeyDown={onEnter} />
            <span className="mut">kg</span>
            <button type="button" className="btn-ghost" onClick={addItem}><Icon n="add" /> Agregar</button>
          </div>

          {err && <p className="err">{err}</p>}
          <div className="modal-foot">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancelar</button>
            <button className="btn-primary" type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar rutina'}</button>
          </div>
        </form>
      </div>
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

function WorkoutCard({ w, reload, all }) {
  const hue = hueFor(w.name);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [ex, setEx] = useState({ type: '', reps: '', weight: '' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const del = async () => { if (confirm(`¿Eliminar rutina "${w.name}"?`)) { await api.remove(w.id); await reload(); } };

  const startEdit = () => {
    setDraft({
      name: w.name,
      date: w.date,
      rows: (w.exercises || []).map((e) => ({ id: e.id, type: e.type, reps: e.reps, weight: e.weight })),
      removed: [],
    });
    setEx({ type: '', reps: '', weight: '' });
    setErr('');
    setEditing(true);
  };
  const cancelEdit = () => setEditing(false);

  const setRow = (i, field, value) =>
    setDraft({ ...draft, rows: draft.rows.map((r, k) => (k === i ? { ...r, [field]: value } : r)) });
  const removeRow = (i) => {
    const r = draft.rows[i];
    setDraft({
      ...draft,
      rows: draft.rows.filter((_, k) => k !== i),
      removed: r.id ? [...draft.removed, r.id] : draft.removed,
    });
  };
  const addRow = () => {
    if (!ex.type.trim()) return;
    setDraft({ ...draft, rows: [...draft.rows, { type: ex.type.trim(), reps: ex.reps, weight: ex.weight }] });
    setEx({ type: '', reps: '', weight: '' });
  };
  const onEnter = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addRow(); }
  };

  const save = async () => {
    if (!draft.name.trim()) { setErr('Escribe el nombre de la rutina'); return; }
    if (draft.rows.some((r) => !String(r.type).trim())) { setErr('Cada ejercicio necesita un nombre'); return; }
    const changed = draft.name.trim() !== w.name.trim() || draft.date !== w.date;
    if (changed && isDuplicate(all, draft.name, draft.date, w.id) && !confirm(DUP_MSG)) return;
    setSaving(true);
    setErr('');
    try {
      await api.update(w.id, { name: draft.name, date: draft.date });
      for (const id of draft.removed) await api.removeExercise(id);
      for (const r of draft.rows) {
        const body = { type: String(r.type).trim(), reps: Number(r.reps) || 0, weight: Number(r.weight) || 0 };
        if (r.id) {
          const old = (w.exercises || []).find((e) => e.id === r.id);
          const changed = !old || old.type !== body.type || Number(old.reps) !== body.reps || Number(old.weight) !== body.weight;
          if (changed) await api.updateExercise(r.id, body);
        } else {
          await api.addExercise(w.id, body);
        }
      }
      setEditing(false);
      await reload();
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="habit" style={{ '--hue': hue }}>
      <div className="habit-mid">
        <div className="habit-head">
          {editing ? (
            <div className="newrow">
              <input className="grow" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
            </div>
          ) : (
            <b><Icon n="fitness_center" /> {w.name}</b>
          )}
          <div className="habit-act">
            {editing ? (
              <>
                <button className="btn-check" type="button" onClick={save} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button className="btn-ghost" type="button" onClick={cancelEdit}>Cancelar</button>
              </>
            ) : (
              <>
                <button className="btn-ghost" type="button" onClick={startEdit} title="Editar rutina"><Icon n="edit" /><span className="btn-txt"> Editar</span></button>
                <button className="btn-danger" type="button" onClick={del} title="Eliminar rutina"><Icon n="delete" /><span className="btn-txt"> Eliminar</span></button>
              </>
            )}
          </div>
        </div>

        {!editing && (
          <div className="chips">
            <span className="chip"><Icon n="calendar_today" /> {w.date}</span>
            <span className="chip"><Icon n="repeat" /> {w.sets} ejercicios</span>
            <span className="chip ghost"><Icon n="scale" /> {Math.round(w.volume)} kg</span>
          </div>
        )}

        {!editing && ((w.exercises || []).length > 0 ? (
          <div className="tbl view">
            <div className="tr th">
              <div>Ejercicio</div>
              <div>Repeticiones</div>
              <div>Peso (kg)</div>
            </div>
            {w.exercises.map((e) => (
              <div key={e.id} className="tr">
                <div className="n">{e.type}</div>
                <div className="c">{e.reps}</div>
                <div className="c">{e.weight}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mut">Aún no hay ejercicios. Toca «Editar» para agregarlos.</p>
        ))}

        {editing && (
          <>
            {draft.rows.length > 0 ? (
              <div className="tbl edit">
                <div className="tr th">
                  <div>Ejercicio</div>
                  <div>Repeticiones</div>
                  <div>Peso (kg)</div>
                  <div />
                </div>
                {draft.rows.map((r, i) => (
                  <div key={r.id ?? `new-${i}`} className="tr">
                    <div><input className="n" value={r.type} onChange={(e) => setRow(i, 'type', e.target.value)} /></div>
                    <div><input className="c" type="number" min="0" value={r.reps} onChange={(e) => setRow(i, 'reps', e.target.value)} /></div>
                    <div><input className="c" type="number" min="0" step="0.5" value={r.weight} onChange={(e) => setRow(i, 'weight', e.target.value)} /></div>
                    <div><button type="button" className="btn-del sm" onClick={() => removeRow(i)} title="Quitar ejercicio"><Icon n="close" /></button></div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mut">Aún no hay ejercicios. Agrégalos aquí abajo.</p>
            )}

            <div className="ex-form">
              <input className="grow" placeholder="Ej: Sentadilla" value={ex.type} onChange={(e) => setEx({ ...ex, type: e.target.value })} onKeyDown={onEnter} />
              <input className="qty" type="number" min="0" placeholder="10" title="repeticiones" value={ex.reps} onChange={(e) => setEx({ ...ex, reps: e.target.value })} onKeyDown={onEnter} />
              <span className="mut">reps</span>
              <input className="qty" type="number" min="0" step="0.5" placeholder="40" title="peso kg" value={ex.weight} onChange={(e) => setEx({ ...ex, weight: e.target.value })} onKeyDown={onEnter} />
              <span className="mut">kg</span>
              <button type="button" className="btn-ghost" onClick={addRow}><Icon n="add" /> Agregar</button>
            </div>
          </>
        )}

        {err && <p className="err">{err}</p>}
      </div>
    </div>
  );
}
