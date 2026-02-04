require("dotenv").config();
const express = require("express");
const app = express();
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { getUploadUrl } = require("./s3");

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL, // must be a normal postgres:// URL
});
const prisma = new PrismaClient({ adapter });

app.use(express.json());

app.get("/health", (req, res) => {
  res.send("API is running");
});

// Post Test User
app.post("/test-user", async (req, res) => {
  const user = await prisma.user.create({
    data: {
      email: `test${Date.now()}@mail.com`,
      password: "test123",
    },
  });

  res.json(user);
});

// POST /reports - Create a new report and get a signed S3 URL for photo upload
app.post("/reports", async (req, res) => {
  const { lat, lng } = req.body;

  // fake user for now
  const user = await prisma.user.findFirst();

  const report = await prisma.report.create({
    data: {
      userId: user.id,
      lat,
      lng,
    },
  });

  const s3Key = `reports/${report.id}.jpg`;

  const uploadUrl = await getUploadUrl(s3Key);

  await prisma.report.update({
    where: { id: report.id },
    data: { photoS3Key: s3Key },
  });

  res.json({
    reportId: report.id,
    uploadUrl,
    s3Key,
  });
});


const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on ${PORT}`));

