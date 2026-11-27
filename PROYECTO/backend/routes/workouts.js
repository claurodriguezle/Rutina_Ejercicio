const express = require('express');
const db = require('../db');
const { auth } = require('../auth');

const router = express.Router();
router.use(auth);

function todayStr(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function ownWorkout(id, userId) {
  return db.prepare('SELECT * FROM Workouts WHERE id = ? AND userId = ?').get(id, userId);
}

function withExercises(w) {
  const exercises = db.prepare('SELECT * FROM Exercises WHERE workoutId = ? ORDER BY id ASC').all(w.id);
  const sets = exercises.length;
  const volume = exercises.reduce((a, e) => a + (Number(e.reps) || 0) * (Number(e.weight) || 0), 0);
  return { ...w, exercises, sets, volume };
}

router.get('/stats/summary', (req, res) => {
  const workouts = db.prepare('SELECT id FROM Workouts WHERE userId = ?').all(req.user.id);
  let totalSets = 0;
  let volume = 0;
  const days = new Set();
  const allW = db.prepare('SELECT id, date FROM Workouts WHERE userId = ?').all(req.user.id);
  allW.forEach((w) => days.add(w.date));
  workouts.forEach((w) => {
    const exs = db.prepare('SELECT reps, weight FROM Exercises WHERE workoutId = ?').all(w.id);
    totalSets += exs.length;
    exs.forEach((e) => { volume += (Number(e.reps) || 0) * (Number(e.weight) || 0); });
  });
  res.json({ totalWorkouts: workouts.length, totalSets, volume, trainedDays: days.size });
});

router.get('/', (req, res) => {
  const workouts = db.prepare('SELECT * FROM Workouts WHERE userId = ? ORDER BY date DESC, id DESC').all(req.user.id);
  res.json(workouts.map(withExercises));
});

router.post('/', (req, res) => {
  const { name, date } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'Nombre de rutina requerido' });
  const d = /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : todayStr();
  const r = db.prepare('INSERT INTO Workouts (userId, name, date) VALUES (?, ?, ?)')
    .run(req.user.id, String(name).trim(), d);
  res.status(201).json(withExercises(db.prepare('SELECT * FROM Workouts WHERE id = ?').get(r.lastInsertRowid)));
});

router.put('/:id', (req, res) => {
  const w = ownWorkout(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'No encontrado' });
  const name = req.body?.name != null ? String(req.body.name).trim() || w.name : w.name;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(req.body?.date || '') ? req.body.date : w.date;
  db.prepare('UPDATE Workouts SET name = ?, date = ? WHERE id = ?').run(name, date, w.id);
  res.json(withExercises(db.prepare('SELECT * FROM Workouts WHERE id = ?').get(w.id)));
});

router.delete('/:id', (req, res) => {
  const w = ownWorkout(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM Workouts WHERE id = ?').run(w.id);
  res.json({ ok: true });
});

router.post('/:id/exercises', (req, res) => {
  const w = ownWorkout(req.params.id, req.user.id);
  if (!w) return res.status(404).json({ error: 'Rutina no encontrada' });
  const { type, reps = 0, weight = 0 } = req.body || {};
  if (!type || !String(type).trim()) return res.status(400).json({ error: 'Tipo de ejercicio requerido' });
  const r = db.prepare('INSERT INTO Exercises (workoutId, type, reps, weight) VALUES (?, ?, ?, ?)')
    .run(w.id, String(type).trim(), Math.max(0, Number(reps) || 0), Math.max(0, Number(weight) || 0));
  res.status(201).json(db.prepare('SELECT * FROM Exercises WHERE id = ?').get(r.lastInsertRowid));
});

function ownExercise(exId, userId) {
  return db.prepare(`
    SELECT e.* FROM Exercises e
    JOIN Workouts w ON w.id = e.workoutId
    WHERE e.id = ? AND w.userId = ?
  `).get(exId, userId);
}

router.put('/exercises/:exId', (req, res) => {
  const e = ownExercise(req.params.exId, req.user.id);
  if (!e) return res.status(404).json({ error: 'No encontrado' });
  const type = req.body?.type != null ? String(req.body.type).trim() || e.type : e.type;
  const reps = req.body?.reps != null ? Math.max(0, Number(req.body.reps) || 0) : e.reps;
  const weight = req.body?.weight != null ? Math.max(0, Number(req.body.weight) || 0) : e.weight;
  db.prepare('UPDATE Exercises SET type = ?, reps = ?, weight = ? WHERE id = ?').run(type, reps, weight, e.id);
  res.json(db.prepare('SELECT * FROM Exercises WHERE id = ?').get(e.id));
});

router.delete('/exercises/:exId', (req, res) => {
  const e = ownExercise(req.params.exId, req.user.id);
  if (!e) return res.status(404).json({ error: 'No encontrado' });
  db.prepare('DELETE FROM Exercises WHERE id = ?').run(e.id);
  res.json({ ok: true });
});

module.exports = router;
