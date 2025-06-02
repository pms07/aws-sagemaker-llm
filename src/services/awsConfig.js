// src/services/awsConfig.js
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient }  from "@aws-sdk/client-cognito-identity";
import { S3Client }               from "@aws-sdk/client-s3";

const REGION = "us-east-1";

// Identity Pool ID from your AWS console → Cognito → Identity Pools → “Identity pool ID”
export const IDENTITY_POOL_ID = "us-east-1:YOUR_IDENTITY_POOL_ID_HERE";

// User Pool ID (for the login “logins” key)
const USER_POOL_ID = import.meta.env.REACT_APP_USER_POOL_ID;

const idToken = localStorage.getItem("idToken") || "";

const cognitoIdentityClient = new CognitoIdentityClient({ region: REGION });

// Create credentials provider using Cognito Identity + your idToken
export const s3Credentials = fromCognitoIdentityPool({
  client: cognitoIdentityClient,
  identityPoolId: IDENTITY_POOL_ID,
  logins: {
    [`cognito-idp.${REGION}.amazonaws.com/${USER_POOL_ID}`]: idToken,
  },
});

// Create an S3 Client that automatically uses those credentials
export const s3Client = new S3Client({
  region: REGION,
  credentials: s3Credentials,
});
