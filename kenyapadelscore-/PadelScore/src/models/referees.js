// backend/models/referee.js (Prisma example)
module.exports = {
  id: "Int @id @default(autoincrement())",
  name: "String",
  email: "String @unique",
  role: "String",   // "Referee" | "Administrator" | "User"
  status: "String", // "Active" | "Pending" | "Suspended"
};
