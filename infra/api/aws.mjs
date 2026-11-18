// The real store (DynamoDB) and team directory (Cognito). The AWS SDK v3 ships with
// the Lambda Node.js runtime, so nothing here needs bundling.
import {randomBytes} from 'node:crypto';
import {DynamoDBClient} from '@aws-sdk/client-dynamodb';
import {DynamoDBDocumentClient, QueryCommand, GetCommand, PutCommand} from '@aws-sdk/lib-dynamodb';
import {
  CognitoIdentityProviderClient, ListUsersCommand, ListUsersInGroupCommand, AdminCreateUserCommand,
  AdminAddUserToGroupCommand, AdminRemoveUserFromGroupCommand, AdminDisableUserCommand,
  AdminEnableUserCommand, AdminUserGlobalSignOutCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {S3Client, DeleteObjectCommand} from '@aws-sdk/client-s3';
import {ROLES} from './app.mjs';
import {presignPost} from './s3post.mjs';

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}), {marshallOptions: {removeUndefinedValues: true}});
const idp = new CognitoIdentityProviderClient({});

async function queryAll(input) {
  const out = [];
  let ExclusiveStartKey;
  do {
    const r = await ddb.send(new QueryCommand({...input, ExclusiveStartKey}));
    out.push(...r.Items);
    ExclusiveStartKey = r.LastEvaluatedKey;
  } while (ExclusiveStartKey);
  return out;
}

export function dynamoStore(TableName) {
  return {
    list: c => queryAll({TableName, KeyConditionExpression: 'c = :c', ExpressionAttributeValues: {':c': c}}),
    changesSince: since => queryAll({TableName, IndexName: 'changes', KeyConditionExpression: 'g = :g AND u > :s', ExpressionAttributeValues: {':g': 'doc', ':s': since}}),
    get: async (c, id) => (await ddb.send(new GetCommand({TableName, Key: {c, id}, ConsistentRead: true}))).Item || null,
    put: (item, expectedV) => ddb.send(new PutCommand(expectedV == null
      ? {TableName, Item: item, ConditionExpression: 'attribute_not_exists(id)'}
      : {TableName, Item: item, ConditionExpression: 'v = :v', ExpressionAttributeValues: {':v': expectedV}})),
    audit: rec => ddb.send(new PutCommand({TableName, Item: {c: 'audit', id: rec.at + '#' + randomBytes(3).toString('hex'), ...rec}})),
    listAudit: async limit => (await ddb.send(new QueryCommand({TableName, KeyConditionExpression: 'c = :c', ExpressionAttributeValues: {':c': 'audit'}, ScanIndexForward: false, Limit: limit}))).Items
  };
}

const attr = (u, name) => (u.Attributes || u.UserAttributes || []).find(a => a.Name === name)?.Value || '';

export function cognitoTeam(UserPoolId) {
  async function all(Command, input, key) {
    const out = [];
    let token;
    do {
      const r = await idp.send(new Command({...input, UserPoolId, ...(Command === ListUsersCommand ? {PaginationToken: token} : {NextToken: token})}));
      out.push(...r[key]);
      token = r.PaginationToken || r.NextToken;
    } while (token);
    return out;
  }
  return {
    async list() {
      const [users, ...byGroup] = await Promise.all([
        all(ListUsersCommand, {}, 'Users'),
        ...ROLES.map(GroupName => all(ListUsersInGroupCommand, {GroupName}, 'Users'))
      ]);
      const role = {};
      ROLES.forEach((r, i) => byGroup[i].forEach(u => { role[u.Username] = r; })); // later roles rank higher
      return users.map(u => ({
        user_id: u.Username, email: attr(u, 'email'), name: attr(u, 'name'),
        role: u.Enabled === false ? 'pending' : role[u.Username] || 'pending',
        enabled: u.Enabled !== false, invited: u.UserStatus === 'FORCE_CHANGE_PASSWORD', created_at: u.UserCreateDate
      })).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    },
    async invite({email, name, role}) {
      let user;
      try {
        ({User: user} = await idp.send(new AdminCreateUserCommand({
          UserPoolId, Username: email, DesiredDeliveryMediums: ['EMAIL'],
          UserAttributes: [{Name: 'email', Value: email}, {Name: 'email_verified', Value: 'true'}, ...(name ? [{Name: 'name', Value: name}] : [])]
        })));
      } catch (e) {
        if (e.name === 'UsernameExistsException') return {ok: false, error: 'That email already has access. Change its role in the list instead.'};
        throw e;
      }
      await idp.send(new AdminAddUserToGroupCommand({UserPoolId, Username: user.Username, GroupName: role}));
      return {ok: true, user_id: user.Username};
    },
    async setRole(Username, role) {
      await Promise.all(ROLES.filter(r => r !== role).map(GroupName =>
        idp.send(new AdminRemoveUserFromGroupCommand({UserPoolId, Username, GroupName})).catch(() => {})));
      if (role === 'pending') {
        await idp.send(new AdminDisableUserCommand({UserPoolId, Username}));
        await idp.send(new AdminUserGlobalSignOutCommand({UserPoolId, Username}));
      } else {
        await idp.send(new AdminEnableUserCommand({UserPoolId, Username}));
        await idp.send(new AdminAddUserToGroupCommand({UserPoolId, Username, GroupName: role}));
      }
    }
  };
}

// Website resource files live under media/ in the site bucket and are served by CloudFront.
export function s3Files(bucket, region) {
  const s3 = new S3Client({});
  return {
    presign: async ({key, contentType, maxBytes}) => presignPost({
      bucket, region, key, contentType, maxBytes,
      credentials: {accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, sessionToken: process.env.AWS_SESSION_TOKEN}
    }),
    remove: key => s3.send(new DeleteObjectCommand({Bucket: bucket, Key: key}))
  };
}
