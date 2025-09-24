const express = require('express');
const prisma = require('../config/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/matches - Get all matches
router.get('/', async (req, res) => {
  try {
    const { status, tournament_id } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;
    if (tournament_id) whereClause.tournament_id = parseInt(tournament_id);

    const matches = await prisma.match.findMany({
      where: whereClause,
      include: {
        team1: true,
        team2: true,
        tournament: true,
        referee: true
      },
      orderBy: {
        scheduled_at: 'asc'
      }
    });

    const formattedMatches = matches.map(match => ({
      ...match,
      team1_name: match.team1.name,
      team2_name: match.team2.name,
      tournament_name: match.tournament.name,
      referee_first_name: match.referee?.first_name || null,
      referee_last_name: match.referee?.last_name || null
    }));

    res.json({
      matches: formattedMatches,
      total: formattedMatches.length
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/matches/:id - Get single match with detailed info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const matchId = parseInt(id);
    
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        team1: {
          include: {
            player1: true,
            player2: true
          }
        },
        team2: {
          include: {
            player1: true,
            player2: true
          }
        },
        tournament: true,
        referee: true
      }
    });

    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({
      match: {
        ...match,
        team1_name: match.team1.name,
        team2_name: match.team2.name,
        tournament_name: match.tournament.name,
        referee_first_name: match.referee?.first_name || null,
        referee_last_name: match.referee?.last_name || null,
        team1_players: [
          { first_name: match.team1.player1.first_name, last_name: match.team1.player1.last_name },
          { first_name: match.team1.player2.first_name, last_name: match.team1.player2.last_name }
        ],
        team2_players: [
          { first_name: match.team2.player1.first_name, last_name: match.team2.player1.last_name },
          { first_name: match.team2.player2.first_name, last_name: match.team2.player2.last_name }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/matches - Create new match (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      tournament_id,
      team1_id,
      team2_id,
      referee_id,
      scheduled_at,
      court_number
    } = req.body;

    if (!tournament_id || !team1_id || !team2_id) {
      return res.status(400).json({ error: 'Tournament ID, team1 ID, and team2 ID are required' });
    }

    if (team1_id === team2_id) {
      return res.status(400).json({ error: 'A team cannot play against itself' });
    }

    const match = await prisma.match.create({
      data: {
        tournament_id: parseInt(tournament_id),
        team1_id: parseInt(team1_id),
        team2_id: parseInt(team2_id),
        referee_id: referee_id ? parseInt(referee_id) : null,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        court_number: court_number ? parseInt(court_number) : null
      }
    });

    res.status(201).json({
      message: 'Match created successfully',
      match
    });
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/matches/:id/score - Update match score (Referee or Admin)
router.put('/:id/score', authenticateToken, requireRole(['admin', 'referee']), async (req, res) => {
  try {
    const { id } = req.params;
    const matchId = parseInt(id);
    
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const {
      team1_score_set1, team1_score_set2, team1_score_set3,
      team2_score_set1, team2_score_set2, team2_score_set3,
      status, winner_id
    } = req.body;

    // If user is referee, check if they are assigned to this match
    if (req.user.role === 'referee') {
      const matchCheck = await prisma.match.findUnique({
        where: { id: matchId },
        select: { referee_id: true }
      });
      
      if (!matchCheck) {
        return res.status(404).json({ error: 'Match not found' });
      }
      
      if (matchCheck.referee_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only update scores for matches you are refereeing' });
      }
    }

    const updateData = {};
    if (team1_score_set1 !== undefined) updateData.team1_score_set1 = parseInt(team1_score_set1);
    if (team1_score_set2 !== undefined) updateData.team1_score_set2 = parseInt(team1_score_set2);
    if (team1_score_set3 !== undefined) updateData.team1_score_set3 = parseInt(team1_score_set3);
    if (team2_score_set1 !== undefined) updateData.team2_score_set1 = parseInt(team2_score_set1);
    if (team2_score_set2 !== undefined) updateData.team2_score_set2 = parseInt(team2_score_set2);
    if (team2_score_set3 !== undefined) updateData.team2_score_set3 = parseInt(team2_score_set3);
    if (status !== undefined) updateData.status = status;
    if (winner_id !== undefined) updateData.winner_id = winner_id ? parseInt(winner_id) : null;

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData
    });

    // Emit real-time update via Socket.IO
    const io = req.app.get('io');
    io.to(`match-${id}`).emit('score-update', {
      matchId: id,
      match: updatedMatch,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Match score updated successfully',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Error updating match score:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/matches/:id - Update match details (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const matchId = parseInt(id);
    
    if (isNaN(matchId)) {
      return res.status(400).json({ error: 'Invalid match ID' });
    }

    const { referee_id, scheduled_at, court_number, status } = req.body;

    const updateData = {};
    if (referee_id !== undefined) updateData.referee_id = referee_id ? parseInt(referee_id) : null;
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at ? new Date(scheduled_at) : null;
    if (court_number !== undefined) updateData.court_number = court_number ? parseInt(court_number) : null;
    if (status !== undefined) updateData.status = status;

    const updatedMatch = await prisma.match.update({
      where: { id: matchId },
      data: updateData
    });

    res.json({
      message: 'Match updated successfully',
      match: updatedMatch
    });
  } catch (error) {
    console.error('Error updating match:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;