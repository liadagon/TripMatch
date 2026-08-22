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

class PayPalApiError extends Error {
  constructor(message, { status, providerError, debugId, path, details } = {}) {
    super(message);
    this.name = "PayPalApiError";
    this.status = status;
    this.providerError = providerError;
    this.debugId = debugId;
    this.path = path;
    this.details = details;
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

function getProviderError(responseBody, fallback) {
  if (typeof responseBody?.name === "string") return responseBody.name;
  if (typeof responseBody?.error === "string") return responseBody.error;

  const issue = responseBody?.details?.find(
    (detail) => typeof detail?.issue === "string",
  )?.issue;

  return issue || fallback;
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

async function requestPayPalApi({
  accessToken,
  method = "GET",
  path,
  body,
  requestId,
}) {
  const { baseUrl } = getPayPalConfiguration();

  if (!accessToken?.trim()) {
    throw new PayPalConfigurationError(
      "A PayPal OAuth access token is required for the Sandbox API request",
    );
  }

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    headers.Prefer = "return=representation";
  }

  if (requestId) {
    headers["PayPal-Request-Id"] = requestId;
  }

  let response;

  try {
    response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new PayPalApiError("PayPal Sandbox API request failed", {
      providerError: error?.name === "TimeoutError" ? "timeout" : "network_error",
    });
  }

  const responseBody = response.status === 204 ? {} : await readResponseBody(response);

  if (!response.ok) {
    throw new PayPalApiError(
      `PayPal Sandbox API request failed with status ${response.status}`,
      {
        status: response.status,
        providerError: getProviderError(responseBody, "api_request_failed"),
        debugId:
          typeof responseBody?.debug_id === "string"
            ? responseBody.debug_id
            : undefined,
        path: path.split("?")[0],
        details: Array.isArray(responseBody?.details)
          ? responseBody.details.map((detail) => ({
              issue: detail?.issue,
              field: detail?.field,
              description: detail?.description,
            }))
          : undefined,
      },
    );
  }

  return responseBody;
}

function buildPagePath(path, page, query = {}) {
  const searchParams = new URLSearchParams({
    ...query,
    page_size: "20",
    page: String(page),
    total_required: "true",
  });

  return `${path}?${searchParams.toString()}`;
}

async function listAllPayPalResources(accessToken, path, query) {
  const resources = [];

  for (let page = 1; page <= 100; page += 1) {
    const response = await requestPayPalApi({
      accessToken,
      path: buildPagePath(path, page, query),
    });
    const pageResources = Array.isArray(response?.products)
      ? response.products
      : Array.isArray(response?.plans)
        ? response.plans
        : [];

    resources.push(...pageResources);

    const hasNextLink = response?.links?.some((link) => link?.rel === "next");
    const totalPages = Number(response?.total_pages);
    const hasAnotherPage = Number.isFinite(totalPages)
      ? page < totalPages
      : hasNextLink;

    if (!hasAnotherPage) return resources;
  }

  throw new PayPalApiError("PayPal Sandbox API pagination exceeded safe limit", {
    providerError: "pagination_limit_exceeded",
  });
}

function listPayPalProducts(accessToken) {
  return listAllPayPalResources(
    accessToken,
    "/v1/catalogs/products",
    {},
  );
}

function getPayPalProduct(accessToken, productId) {
  return requestPayPalApi({
    accessToken,
    path: `/v1/catalogs/products/${encodeURIComponent(productId)}`,
  });
}

function createPayPalProduct(accessToken, product, requestId) {
  return requestPayPalApi({
    accessToken,
    method: "POST",
    path: "/v1/catalogs/products",
    body: product,
    requestId,
  });
}

function listPayPalPlans(accessToken, productId) {
  return listAllPayPalResources(
    accessToken,
    "/v1/billing/plans",
    { product_id: productId },
  );
}

function getPayPalPlan(accessToken, planId) {
  return requestPayPalApi({
    accessToken,
    path: `/v1/billing/plans/${encodeURIComponent(planId)}`,
  });
}

function createPayPalPlan(accessToken, plan, requestId) {
  return requestPayPalApi({
    accessToken,
    method: "POST",
    path: "/v1/billing/plans",
    body: plan,
    requestId,
  });
}

function activatePayPalPlan(accessToken, planId) {
  return requestPayPalApi({
    accessToken,
    method: "POST",
    path: `/v1/billing/plans/${encodeURIComponent(planId)}/activate`,
  });
}

module.exports = {
  PAYPAL_SANDBOX_BASE_URL,
  PayPalApiError,
  PayPalConfigurationError,
  PayPalOAuthError,
  activatePayPalPlan,
  createPayPalPlan,
  createPayPalProduct,
  getPayPalPlan,
  getPayPalProduct,
  getPayPalConfigurationStatus,
  listPayPalPlans,
  listPayPalProducts,
  requestPayPalAccessToken,
};
