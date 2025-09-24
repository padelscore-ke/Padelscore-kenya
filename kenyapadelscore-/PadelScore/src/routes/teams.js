const express = require('express');
const prisma = require('../config/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/teams - Get all teams with player details
router.get('/', async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        player1: true,
        player2: true
      },
      orderBy: {
        ranking: 'desc'
      }
    });

    const formattedTeams = teams.map(team => ({
      id: team.id,
      name: team.name,
      ranking: team.ranking,
      wins: team.wins,
      losses: team.losses,
      created_at: team.created_at,
      players: [
        {
          id: team.player1.id,
          first_name: team.player1.first_name,
          last_name: team.player1.last_name
        },
        {
          id: team.player2.id,
          first_name: team.player2.first_name,
          last_name: team.player2.last_name
        }
      ]
    }));

    res.json({
      teams: formattedTeams,
      total: formattedTeams.length
    });
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/teams/:id - Get single team
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = parseInt(id);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    const team = await prisma.team.findUnique({
      where: { id: teamId },
      include: {
        player1: true,
        player2: true
      }
    });

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    res.json({
      team: {
        ...team,
        players: [
          {
            id: team.player1.id,
            first_name: team.player1.first_name,
            last_name: team.player1.last_name
          },
          {
            id: team.player2.id,
            first_name: team.player2.first_name,
            last_name: team.player2.last_name
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/teams - Create new team (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { name, player1_id, player2_id, ranking = 1000 } = req.body;

    if (!name || !player1_id || !player2_id) {
      return res.status(400).json({ error: 'Team name and both player IDs are required' });
    }

    const player1Id = parseInt(player1_id);
    const player2Id = parseInt(player2_id);
    
    if (isNaN(player1Id) || isNaN(player2Id)) {
      return res.status(400).json({ error: 'Invalid player IDs' });
    }

    if (player1Id === player2Id) {
      return res.status(400).json({ error: 'A team cannot have the same player twice' });
    }

    // Check if players exist
    const players = await prisma.player.findMany({
      where: {
        id: { in: [player1Id, player2Id] }
      }
    });

    if (players.length !== 2) {
      return res.status(400).json({ error: 'One or both players not found' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        player1_id: player1Id,
        player2_id: player2Id,
        ranking
      }
    });

    res.status(201).json({
      message: 'Team created successfully',
      team
    });
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/teams/:id - Update team (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, ranking, wins, losses } = req.body;
    
    const teamId = parseInt(id);
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    // Build update data object with only provided fields
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (ranking !== undefined) updateData.ranking = ranking;
    if (wins !== undefined) updateData.wins = wins;
    if (losses !== undefined) updateData.losses = losses;

    const team = await prisma.team.update({
      where: { id: teamId },
      data: updateData
    });

    res.json({
      message: 'Team updated successfully',
      team
    });
  } catch (error) {
    console.error('Error updating team:', error);
    if (error.code === 'P2025') { // Prisma record not found
      return res.status(404).json({ error: 'Team not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/teams/:id - Delete team (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const teamId = parseInt(id);
    
    if (isNaN(teamId)) {
      return res.status(400).json({ error: 'Invalid team ID' });
    }

    await prisma.team.delete({
      where: { id: teamId }
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    if (error.code === 'P2025') { // Prisma record not found
      return res.status(404).json({ error: 'Team not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;