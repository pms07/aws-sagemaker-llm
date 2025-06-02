// index.js (CommonJS version with CORS support)

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl }            = require("@aws-sdk/s3-request-presigner");

// Use Node 18.x or 16.x runtime in Lambda.
const REGION      = process.env.AWS_REGION || "us-east-1";
const BUCKET_NAME = process.env.S3_BUCKET_NAME; // set in Lambda env

// Create an S3 client (Lambda role’s IAM permissions will flow automatically)
const s3Client = new S3Client({ region: REGION });

module.exports.handler = async (event) => {
  // 0) Handle CORS preflight (OPTIONS) requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      },
      body: ""
    };
  }

  try {
    // 1) Verify Cognito authorizer claims exist
    const claims = event.requestContext.authorizer?.claims;
    if (!claims || !claims.sub) {
      return {
        statusCode: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        body: JSON.stringify({ message: "Unauthorized: no claims" }),
      };
    }
    const userSub = claims.sub; // The user’s unique ID from Cognito

    // 2) Parse JSON body
    if (!event.body) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        body: JSON.stringify({ message: "Missing request body" }),
      };
    }
    let body;
    try {
      body = JSON.parse(event.body);
    } catch (parseErr) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        body: JSON.stringify({ message: "Invalid JSON body" }),
      };
    }

    const { fileName, fileType } = body;
    if (!fileName || !fileType) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        body: JSON.stringify({
          message: "fileName and fileType are required in the body",
        }),
      };
    }

    // 3) Construct the S3 object key: "<userSub>/<fileName>"
    const s3Key = `${userSub}/${fileName}`;

    // 4) Create a PutObjectCommand
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: fileType,
      ACL: "private",
    });

    // 5) Generate a presigned URL (expires in 5 minutes)
    const uploadUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 300,
    });

    // 6) Return the URL and the key, including CORS headers
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      },
      body: JSON.stringify({ uploadUrl, key: s3Key }),
    };
  } catch (err) {
    console.error("Error in presign generation:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
      },
      body: JSON.stringify({
        message: "Internal server error while generating presigned URL",
        error: err.message,
      }),
    };
  }
};
