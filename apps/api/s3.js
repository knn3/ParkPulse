const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

async function getUploadUrl(key) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: "image/jpeg",
  });

  return await getSignedUrl(s3, command, { expiresIn: 300 });
}

module.exports = { getUploadUrl };
