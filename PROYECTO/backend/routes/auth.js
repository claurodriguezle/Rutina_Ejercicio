const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { sign } = require('../auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  if (String(password).length < 4) return res.status(400).json({ error: 'Contraseña mínima 4 caracteres' });
  try {
    const hash = bcrypt.hashSync(String(password), 10);
    const r = db.prepare('INSERT INTO Users (username, passwordHash) VALUES (?, ?)').run(String(username).trim(), hash);
    const user = { id: Number(r.lastInsertRowid), username: String(username).trim() };
    res.json({ token: sign(user), user });
  } catch (e) {
    if (String(e.message).includes('UNIQUE')) return res.status(409).json({ error: 'Usuario ya existe' });
    res.status(500).json({ error: 'Error al registrar' });
  }
});

router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const row = db.prepare('SELECT * FROM Users WHERE username = ?').get(String(username).trim());
  if (!row || !bcrypt.compareSync(String(password), row.passwordHash)) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }
  const user = { id: row.id, username: row.username };
  res.json({ token: sign(user), user });
});

module.exports = router;
