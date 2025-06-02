// index.mjs
import {
  CognitoIdentityProviderClient,
  SignUpCommand,
  AdminConfirmSignUpCommand
} from "@aws-sdk/client-cognito-identity-provider";

// ──────────────────────────────────────────────────────────────────────────────
// Create a CognitoIdentityProviderClient (v3) in the region specified by
// the AWS_REGION environment variable (or default to "us-east-1").
// ──────────────────────────────────────────────────────────────────────────────
const client = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "us-east-1",
});

export const handler = async (event) => {
  console.log("▶️ Incoming event:", JSON.stringify(event, null, 2));

  try {
    // 1) Parse incoming JSON body (Lambda proxy integration):
    const rawBody = event.body || "{}";
    console.log("📥 raw event.body:", rawBody);

    let body;
    try {
      body = JSON.parse(rawBody);
    } catch (parseErr) {
      console.error("❌ JSON.parse error:", parseErr);
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Invalid JSON in request body." }),
      };
    }

    const { email, password } = body;
    console.log("📋 Parsed payload:", { email, password });

    if (!email || !password) {
      console.warn("⚠️ Missing email or password");
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Email and password are required." }),
      };
    }

    // 2) Read environment variables:
    const clientId   = process.env.COGNITO_CLIENT_ID;
    const userPoolId = process.env.COGNITO_USER_POOL_ID;

    if (!clientId || !userPoolId) {
      console.error("❌ Missing COGNITO_CLIENT_ID or COGNITO_USER_POOL_ID!");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Server misconfiguration: missing Cognito environment variables.",
        }),
      };
    }
    console.log("🔑 Using COGNITO_CLIENT_ID =", clientId);
    console.log("🔒 Using COGNITO_USER_POOL_ID =", userPoolId);

    // 3) Call Cognito SignUpCommand:
    const signUpParams = {
      ClientId: clientId,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: "email", Value: email }
      ],
    };
    console.log("🚀 Calling Cognito SignUpCommand with:", JSON.stringify(signUpParams));
    const signUpResult = await client.send(new SignUpCommand(signUpParams));
    console.log("✅ Cognito signUp succeeded:", JSON.stringify(signUpResult));

    // 4) Immediately confirm that new user with AdminConfirmSignUpCommand:
    const confirmParams = {
      UserPoolId: userPoolId,
      Username:   email
    };
    console.log("🔐 Calling Cognito AdminConfirmSignUpCommand with:", JSON.stringify(confirmParams));
    await client.send(new AdminConfirmSignUpCommand(confirmParams));
    console.log("✅ Cognito adminConfirmSignUp succeeded");

    // 5) Return success (200) with CORS headers:
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "User registration successful (auto-confirmed).",
        userSub: signUpResult.UserSub
      }),
    };
  }
  catch (err) {
    // Log unexpected errors:
    console.error("❌ Unexpected error in Register Lambda:", err);

    let statusCode = 500;
    let message    = "Internal server error";

    if (err.name === "UsernameExistsException") {
      statusCode = 400;
      message    = "An account with that email already exists.";
    }

    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message }),
    };
  }
};
