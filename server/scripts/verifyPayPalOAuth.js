const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const {
  PayPalConfigurationError,
  PayPalOAuthError,
  getPayPalConfigurationStatus,
  requestPayPalAccessToken,
} = require("../services/paypalService");

async function verifyPayPalOAuth() {
  const configuration = getPayPalConfigurationStatus();

  console.log("PayPal Sandbox OAuth configuration", configuration);

  if (
    !configuration.clientIdConfigured ||
    !configuration.clientSecretConfigured ||
    !configuration.baseUrlConfigured ||
    !configuration.sandboxBaseUrl
  ) {
    throw new PayPalConfigurationError(
      "PayPal Sandbox OAuth configuration is incomplete or not sandbox-only",
    );
  }

  const { accessToken, tokenType, expiresIn } =
    await requestPayPalAccessToken();

  console.log("PayPal Sandbox OAuth: PASS");
  console.log(`Access token received: ${accessToken ? "YES" : "NO"}`);
  console.log(`Token type: ${tokenType}`);
  console.log(`Expires in: ${expiresIn} seconds`);
}

verifyPayPalOAuth().catch((error) => {
  console.error("PayPal Sandbox OAuth: FAIL");

  if (error instanceof PayPalConfigurationError) {
    console.error(error.message);
  } else if (error instanceof PayPalOAuthError) {
    console.error(error.message, {
      status: error.status,
      providerError: error.providerError,
    });
  } else {
    console.error("PayPal Sandbox OAuth verification failed safely");
  }

  process.exitCode = 1;
});
