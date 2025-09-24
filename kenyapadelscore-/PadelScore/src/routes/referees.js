const express = require("express");
const router = express.Router();

// Fake DB for now (replace with Prisma/Mongo later)
let referees = [
  { id: 1, name: "John Doe", email: "john.doe@example.com", role: "Referee", status: "Active" },
  { id: 2, name: "Jane Smith", email: "jane.smith@example.com", role: "Administrator", status: "Active" },
];

// GET all referees
router.get("/", (req, res) => {
  res.json(referees);
});

// ADD referee
router.post("/", (req, res) => {
  const newRef = { id: Date.now(), ...req.body };
  referees.push(newRef);
  res.json(newRef);
});

// UPDATE referee
router.put("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  referees = referees.map(r => r.id === id ? { ...r, ...req.body } : r);
  res.json({ success: true });
});

// DELETE referee
router.delete("/:id", (req, res) => {
  const id = parseInt(req.params.id);
  referees = referees.filter(r => r.id !== id);
  res.json({ success: true });
});

module.exports = router;
