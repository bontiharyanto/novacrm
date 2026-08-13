import { createHash } from 'crypto';
import { GetObjectCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getMinioConfig() {
  const endpoint = process.env.MINIO_ENDPOINT ?? 'http://127.0.0.1:9000';
  const accessKey = process.env.MINIO_ACCESS_KEY ?? process.env.MINIO_ROOT_USER ?? 'minioadmin';
  const secretKey = process.env.MINIO_SECRET_KEY ?? process.env.MINIO_ROOT_PASSWORD ?? 'minioadmin';
  const bucket = process.env.MINIO_BUCKET ?? 'novacrm';
  const region = process.env.MINIO_REGION ?? 'us-east-1';

  return { endpoint, accessKey, secretKey, bucket, region };
}

function createMinioClient() {
  const { endpoint, accessKey, secretKey, region } = getMinioConfig();
  return new S3Client({
    region,
    endpoint,
    forcePathStyle: true,
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
  });
}

export function buildObjectKey(tenantId: string, filename: string) {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
  const stamp = createHash('sha1').update(`${tenantId}:${filename}:${Date.now()}`).digest('hex').slice(0, 12);
  return `${tenantId}/${stamp}-${safeName}`;
}

export async function createPresignedUpload(input: {
  tenantId: string;
  filename: string;
  contentType: string;
  expiresIn?: number;
}) {
  const { bucket } = getMinioConfig();
  const client = createMinioClient();
  const key = buildObjectKey(input.tenantId, input.filename);

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    return { data: null, error: `MinIO bucket "${bucket}" is not available` };
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: input.contentType || 'application/octet-stream',
  });

  const url = await getSignedUrl(client, command, { expiresIn: input.expiresIn ?? 300 });
  return { data: { url, key, bucket, method: 'PUT' as const }, error: null };
}

export async function createPresignedDownload(key: string, expiresIn = 300) {
  const { bucket } = getMinioConfig();
  const client = createMinioClient();
  const url = await getSignedUrl(client, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
  return { data: { url, key, bucket }, error: null };
}
