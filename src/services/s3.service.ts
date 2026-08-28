import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import crypto from 'crypto';

// S3 veya Cloudflare R2 için istemciyi (Client) oluşturuyoruz
const s3Config: any = {
  region: process.env.AWS_REGION || 'auto',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
};
if (process.env.S3_ENDPOINT_URL) {
  s3Config.endpoint = process.env.S3_ENDPOINT_URL;
}
const s3Client = new S3Client(s3Config);

export const uploadFile = async (fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> => {
  const bucketName = process.env.S3_BUCKET_NAME;
  
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME environment variable is not set!');
  }

  // Aynı isimli dosyaların üstüne yazmasını önlemek için ismin başına rastgele string ekliyoruz
  const uniquePrefix = crypto.randomBytes(4).toString('hex');
  const uniqueFileName = `${uniquePrefix}-${fileName.replace(/\s+/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: uniqueFileName,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  // Eğer Cloudflare R2'de Public (Herkese Açık) bir bucket kullanıyorsan, doğrudan URL döndürebilirsin.
  // Örn: PUBLIC_URL=https://pub-xxxxxx.r2.dev
  const publicDomain = process.env.S3_PUBLIC_DOMAIN;
  if (publicDomain) {
    return `${publicDomain}/${uniqueFileName}`;
  }

  // Public domain yoksa standart S3 linki döndür (Bucket private ise erişilemeyebilir)
  return `https://${bucketName}.s3.${process.env.AWS_REGION || 'auto'}.amazonaws.com/${uniqueFileName}`;
};
