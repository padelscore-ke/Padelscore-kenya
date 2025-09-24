const express = require('express');
const prisma = require('../config/prisma');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/players - Get all players
router.get('/', async (req, res) => {
  try {
    const players = await prisma.player.findMany({
      orderBy: {
        ranking: 'desc'
      }
    });

    res.json({
      players,
      total: players.length
    });
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/players/:id - Get single player
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const playerId = parseInt(id);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    const player = await prisma.player.findUnique({
      where: { id: playerId }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json({ player });
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/players - Create new player (Admin only)
router.post('/', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { first_name, last_name, email, phone, ranking = 1000 } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    const player = await prisma.player.create({
      data: {
        first_name,
        last_name,
        email,
        phone,
        ranking
      }
    });

    res.status(201).json({
      message: 'Player created successfully',
      player
    });
  } catch (error) {
    console.error('Error creating player:', error);
    if (error.code === 'P2002') { // Prisma unique constraint violation
      return res.status(409).json({ error: 'Player with this email already exists' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/players/:id - Update player (Admin only)
router.put('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, ranking, wins, losses } = req.body;
    
    const playerId = parseInt(id);
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    // Build update data object with only provided fields
    const updateData = {};
    if (first_name !== undefined) updateData.first_name = first_name;
    if (last_name !== undefined) updateData.last_name = last_name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (ranking !== undefined) updateData.ranking = ranking;
    if (wins !== undefined) updateData.wins = wins;
    if (losses !== undefined) updateData.losses = losses;

    const player = await prisma.player.update({
      where: { id: playerId },
      data: updateData
    });

    res.json({
      message: 'Player updated successfully',
      player
    });
  } catch (error) {
    console.error('Error updating player:', error);
    if (error.code === 'P2025') { // Prisma record not found
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/players/:id - Delete player (Admin only)
router.delete('/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const playerId = parseInt(id);
    
    if (isNaN(playerId)) {
      return res.status(400).json({ error: 'Invalid player ID' });
    }

    await prisma.player.delete({
      where: { id: playerId }
    });

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    console.error('Error deleting player:', error);
    if (error.code === 'P2025') { // Prisma record not found
      return res.status(404).json({ error: 'Player not found' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;