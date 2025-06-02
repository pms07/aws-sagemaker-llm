// index.mjs
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";

// 1) Create a CognitoIdentityProviderClient.  Make sure AWS_REGION is set to the same region
//    where your user pool lives (e.g. "us-east-1").
const cognitoClient = new CognitoIdentityProviderClient({
  region: "us-east-1",
});

export const handler = async (event) => {
  console.log("▶️ Incoming event:", JSON.stringify(event));

  try {
    // 2) Parse the JSON body
    const rawBody = event.body || "{}";
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
    console.log("📋 Parsed login payload:", { email, password });

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

    // 3) Read the App Client ID from environment variables
    const clientId = process.env.COGNITO_CLIENT_ID;
    if (!clientId) {
      console.error("❌ Missing environment variable COGNITO_CLIENT_ID");
      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({
          message: "Server misconfiguration: COGNITO_CLIENT_ID is not set.",
        }),
      };
    }
    console.log("🔑 Using COGNITO_CLIENT_ID:", clientId);

    // 4) Build the InitiateAuthCommand
    const params = {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    };
    console.log("🚀 Calling InitiateAuthCommand with:", JSON.stringify(params));

    // 5) Attempt to sign in
    const authResult = await cognitoClient.send(
      new InitiateAuthCommand(params)
    );
    console.log("✅ Cognito InitiateAuthCommand succeeded:", authResult);

    // 6) Return the tokens back to the client
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        message: "Login successful.",
        // These are your tokens: IdToken, AccessToken, RefreshToken (if configured)
        idToken: authResult.AuthenticationResult?.IdToken,
        accessToken: authResult.AuthenticationResult?.AccessToken,
        refreshToken: authResult.AuthenticationResult?.RefreshToken,
        expiresIn: authResult.AuthenticationResult?.ExpiresIn, // in seconds
        tokenType: authResult.AuthenticationResult?.TokenType,
      }),
    };
  } catch (err) {
    console.error("❌ Unexpected error in Login Lambda:", err);
    let code = 500;
    let message = "Internal server error";

    // Catch common Cognito errors:
    if (err.name === "NotAuthorizedException" || err.name === "UserNotFoundException") {
      code = 400;
      message = "Incorrect email or password.";
    } else if (err.name === "UserNotConfirmedException") {
      code = 400;
      message = "User is not confirmed. Please verify your email first.";
    }

    return {
      statusCode: code,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ message }),
    };
  }
};
