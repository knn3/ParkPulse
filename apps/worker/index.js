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

    // key should be: reports/<reportId>.jpg
    const filename = key.split("/").pop();          // "<reportId>.jpg"
    const reportId = filename?.replace(".jpg", ""); // "<reportId>"

    if (!reportId || reportId.length < 20) {
    console.log("Skipping non-report key:", key);
    // still delete the message so it doesn't loop forever
    await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
    }));
    continue;
    }

    console.log("Processing report:", reportId);

    const exists = await prisma.report.findUnique({ where: { id: reportId } });

    if (!exists) {
    console.log("Report not found in DB, skipping:", reportId);
    await sqs.send(new DeleteMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL,
        ReceiptHandle: msg.ReceiptHandle,
    }));
    continue;
    }

    await prisma.report.update({
    where: { id: reportId },
    data: { status: "PROCESSED", score: Math.random() },
    });

    await sqs.send(new DeleteMessageCommand({
    QueueUrl: process.env.SQS_QUEUE_URL,
    ReceiptHandle: msg.ReceiptHandle,
    }));

  }
}

setInterval(poll, 5000);
console.log("Worker polling SQS...");
