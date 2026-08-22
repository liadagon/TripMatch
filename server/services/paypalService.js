const PAYPAL_SANDBOX_BASE_URL = "https://api-m.sandbox.paypal.com";
const PAYPAL_OAUTH_PATH = "/v1/oauth2/token";
const REQUEST_TIMEOUT_MS = 15_000;

class PayPalConfigurationError extends Error {
  constructor(message, missingVariables = []) {
    super(message);
    this.name = "PayPalConfigurationError";
    this.missingVariables = missingVariables;
  }
}

class PayPalOAuthError extends Error {
  constructor(message, { status, providerError } = {}) {
    super(message);
    this.name = "PayPalOAuthError";
    this.status = status;
    this.providerError = providerError;
  }
}

function normalizeBaseUrl(baseUrl) {
  return baseUrl.replace(/\/+$/, "");
}

function getPayPalConfigurationStatus() {
  const baseUrl = process.env.PAYPAL_BASE_URL?.trim() || "";

  return {
    clientIdConfigured: Boolean(process.env.PAYPAL_CLIENT_ID?.trim()),
    clientSecretConfigured: Boolean(process.env.PAYPAL_CLIENT_SECRET?.trim()),
    baseUrlConfigured: Boolean(baseUrl),
    sandboxBaseUrl: normalizeBaseUrl(baseUrl) === PAYPAL_SANDBOX_BASE_URL,
  };
}

function getPayPalConfiguration() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const configuredBaseUrl = process.env.PAYPAL_BASE_URL?.trim();
  const missingVariables = [];

  if (!clientId) missingVariables.push("PAYPAL_CLIENT_ID");
  if (!clientSecret) missingVariables.push("PAYPAL_CLIENT_SECRET");
  if (!configuredBaseUrl) missingVariables.push("PAYPAL_BASE_URL");

  if (missingVariables.length > 0) {
    throw new PayPalConfigurationError(
      `PayPal configuration is incomplete: ${missingVariables.join(", ")}`,
      missingVariables,
    );
  }

  const baseUrl = normalizeBaseUrl(configuredBaseUrl);

  if (baseUrl !== PAYPAL_SANDBOX_BASE_URL) {
    throw new PayPalConfigurationError(
      "PayPal OAuth verification is restricted to the Sandbox base URL",
    );
  }

  return { baseUrl, clientId, clientSecret };
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

async function requestPayPalAccessToken() {
  const { baseUrl, clientId, clientSecret } = getPayPalConfiguration();
  const basicAuthorization = Buffer.from(
    `${clientId}:${clientSecret}`,
    "utf8",
  ).toString("base64");
  let response;

  try {
    response = await fetch(`${baseUrl}${PAYPAL_OAUTH_PATH}`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Basic ${basicAuthorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ grant_type: "client_credentials" }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new PayPalOAuthError("PayPal Sandbox OAuth request failed", {
      providerError: error?.name === "TimeoutError" ? "timeout" : "network_error",
    });
  }

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw new PayPalOAuthError(
      `PayPal Sandbox OAuth request failed with status ${response.status}`,
      {
        status: response.status,
        providerError:
          typeof responseBody?.error === "string"
            ? responseBody.error
            : "oauth_request_failed",
      },
    );
  }

  const accessToken =
    typeof responseBody?.access_token === "string"
      ? responseBody.access_token.trim()
      : "";
  const tokenType =
    typeof responseBody?.token_type === "string"
      ? responseBody.token_type.trim()
      : "";
  const expiresIn = Number(responseBody?.expires_in);

  if (!accessToken || !tokenType || !Number.isFinite(expiresIn) || expiresIn <= 0) {
    throw new PayPalOAuthError(
      "PayPal Sandbox OAuth response did not contain valid token metadata",
      { status: response.status, providerError: "invalid_oauth_response" },
    );
  }

  return { accessToken, tokenType, expiresIn };
}

module.exports = {
  PAYPAL_SANDBOX_BASE_URL,
  PayPalConfigurationError,
  PayPalOAuthError,
  getPayPalConfigurationStatus,
  requestPayPalAccessToken,
};
