require("dotenv").config();
const express = require("express");
const app = express();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL, // must be a normal postgres:// URL
});
const prisma = new PrismaClient({ adapter });

app.use(express.json());

app.get("/health", (req, res) => {
  res.send("API is running");
});

app.post("/test-user", async (req, res) => {
  const user = await prisma.user.create({
    data: {
      email: `test${Date.now()}@mail.com`,
      password: "test123",
    },
  });

  res.json(user);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));

