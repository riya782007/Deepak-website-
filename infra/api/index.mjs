// Lambda entry point, called through a Lambda function URL (no API Gateway to pay for).
import {createApp} from './app.mjs';
import {dynamoStore, cognitoTeam, s3Files} from './aws.mjs';
import {verifyIdToken} from './jwt.mjs';

const {TABLE, POOL_ID, CLIENT_ID, AWS_REGION, MEDIA_BUCKET, MEDIA_BASE} = process.env;
const app = createApp({
  store: dynamoStore(TABLE),
  team: cognitoTeam(POOL_ID),
  files: MEDIA_BUCKET ? s3Files(MEDIA_BUCKET, AWS_REGION) : null,
  mediaBase: (MEDIA_BASE || '').replace(/\/$/, ''),
  verify: token => verifyIdToken(token, {region: AWS_REGION, poolId: POOL_ID, clientId: CLIENT_ID})
});

export async function handler(event) {
  const body = event.body && event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
  const res = await app({
    method: event.requestContext.http.method,
    path: event.rawPath,
    headers: event.headers || {},
    query: event.queryStringParameters || {},
    body: body && body.length > 400_000 ? '"too large"' : body
  });
  return {statusCode: res.status, headers: {'content-type': 'application/json', 'cache-control': 'no-store', ...res.headers}, body: JSON.stringify(res.body)};
}
