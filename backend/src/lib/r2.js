import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

export async function uploadReceiptFile({ buffer, mimeType, originalName, userId }) {
    const ext = (originalName.split('.').pop() || 'bin').toLowerCase();
    const key = `receipts/${userId}/${Date.now()}-${randomUUID()}.${ext}`;

    await r2.send(new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
    }));

    return { key, fileType: mimeType === 'application/pdf' ? 'pdf' : 'image' };
}

export async function getReceiptViewUrl(key, expiresInSeconds = 900) {
    const command = new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key });
    return getSignedUrl(r2, command, { expiresIn: expiresInSeconds });
}

export async function deleteReceiptFile(key) {
    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key }));
}