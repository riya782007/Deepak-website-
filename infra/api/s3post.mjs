// Presigned S3 POST (AWS Signature Version 4) built with Node's crypto, so the
// browser can upload a file straight to the bucket. The policy pins the exact key,
// content type and maximum size, and expires after 15 minutes.
import {createHmac} from 'node:crypto';

const hmac = (key, data) => createHmac('sha256', key).update(data).digest();

export function signingKey(secret, day, region, service = 's3') {
  return hmac(hmac(hmac(hmac('AWS4' + secret, day), region), service), 'aws4_request');
}

export function presignPost({bucket, region, key, contentType, maxBytes, credentials, now = new Date(), expiresIn = 900}) {
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const day = amzDate.slice(0, 8);
  const fields = {
    key,
    'Content-Type': contentType,
    'Cache-Control': 'public,max-age=31536000,immutable',
    'x-amz-algorithm': 'AWS4-HMAC-SHA256',
    'x-amz-credential': `${credentials.accessKeyId}/${day}/${region}/s3/aws4_request`,
    'x-amz-date': amzDate,
    ...(credentials.sessionToken ? {'x-amz-security-token': credentials.sessionToken} : {})
  };
  const policy = {
    expiration: new Date(now.getTime() + expiresIn * 1000).toISOString(),
    conditions: [{bucket}, ['content-length-range', 1, maxBytes], ...Object.entries(fields).map(([k, v]) => ({[k]: v}))]
  };
  const encoded = Buffer.from(JSON.stringify(policy)).toString('base64');
  fields.Policy = encoded;
  fields['x-amz-signature'] = createHmac('sha256', signingKey(credentials.secretAccessKey, day, region)).update(encoded).digest('hex');
  return {url: `https://${bucket}.s3.${region}.amazonaws.com/`, fields};
}
