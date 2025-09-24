const express = require("express");
const cors = require("cors");
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Socket.IO setup for real-time updates
const io = new Server(server, {
  cors: {
    origin: true, // Allow all origins in development for Replit environment
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
  }
});

// Middleware
app.use(cors({
  origin: true, // Allow all origins in development for Replit environment
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
const frontendRoot = path.join(__dirname, '..');
app.use('/', express.static(path.join(frontendRoot, 'admin')));
app.use('/referee', express.static(path.join(frontendRoot, 'referee')));
app.use('/live', express.static(path.join(frontendRoot, 'live')));

// Default route → Admin dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendRoot, 'admin', 'index.html'));
});

// Make io accessible in routes
app.set('io', io);

// Routes
const authRoutes = require('./routes/auth');
const playerRoutes = require('./routes/players');
const teamRoutes = require('./routes/teams');
const tournamentRoutes = require('./routes/tournaments');
const matchRoutes = require('./routes/matches');
const leaderboardRoutes = require('./routes/leaderboard');

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'PADELSCORE Backend API is running',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-match', (matchId) => {
    socket.join(`match-${matchId}`);
    console.log(`Client ${socket.id} joined match ${matchId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler - must be last
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`PADELSCORE server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Admin dashboard available at /`);
  console.log(`Referee panel available at /referee`);
  console.log(`Live panel available at /live`);
});

module.exports = app;