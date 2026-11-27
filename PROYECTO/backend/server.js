const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/workouts', workoutRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend rutinas en http://localhost:${PORT}`));
