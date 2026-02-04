require("dotenv").config();

const {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} = require("@aws-sdk/client-sqs");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const sqs = new SQSClient({ region: process.env.AWS_REGION });
const s3 = new S3Client({ region: process.env.AWS_REGION });

async function poll() {
  const res = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: process.env.SQS_QUEUE_URL,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 10,
    }),
  );

  if (!res.Messages) return;

  for (const msg of res.Messages) {
    const { key } = JSON.parse(msg.Body);

    const reportId = key.split("/")[1].replace(".jpg", "");

    console.log("Processing report:", reportId);

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSED", score: Math.random() },
    });

    await sqs.send(
      new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
      }),
    );
  }
}

setInterval(poll, 5000);
console.log("Worker polling SQS...");
