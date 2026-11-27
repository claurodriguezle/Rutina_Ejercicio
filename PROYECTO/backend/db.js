const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'ejercicios.db'));

db.exec(`
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS Users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  passwordHash TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS Workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId INTEGER NOT NULL REFERENCES Users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  createdAt TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS Exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workoutId INTEGER NOT NULL REFERENCES Workouts(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reps INTEGER NOT NULL DEFAULT 0,
  weight REAL NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_workouts_user ON Workouts(userId);
CREATE INDEX IF NOT EXISTS idx_exercises_workout ON Exercises(workoutId);
`);

module.exports = db;
