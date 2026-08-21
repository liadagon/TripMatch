const BREVO_EMAIL_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 15_000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

class EmailConfigurationError extends Error {
  constructor(message, missingVariables = []) {
    super(message);
    this.name = "EmailConfigurationError";
    this.missingVariables = missingVariables;
  }
}

class EmailDeliveryError extends Error {
  constructor(message, { status, providerCode, isIpAuthorizationError } = {}) {
    super(message);
    this.name = "EmailDeliveryError";
    this.status = status;
    this.providerCode = providerCode;
    this.isIpAuthorizationError = Boolean(isIpAuthorizationError);
  }
}

function getEmailConfigurationStatus() {
  return {
    apiKeyConfigured: Boolean(process.env.BREVO_API_KEY?.trim()),
    senderEmailConfigured: Boolean(process.env.BREVO_SENDER_EMAIL?.trim()),
    senderNameConfigured: Boolean(process.env.BREVO_SENDER_NAME?.trim()),
    testEmailConfigured: Boolean(process.env.BREVO_TEST_EMAIL?.trim()),
  };
}

function getBrevoConfiguration() {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "TripMatch";
  const missingVariables = [];

  if (!apiKey) missingVariables.push("BREVO_API_KEY");
  if (!senderEmail) missingVariables.push("BREVO_SENDER_EMAIL");

  if (missingVariables.length > 0) {
    throw new EmailConfigurationError(
      `Brevo email configuration is incomplete: ${missingVariables.join(", ")}`,
      missingVariables,
    );
  }

  if (!EMAIL_PATTERN.test(senderEmail)) {
    throw new EmailConfigurationError(
      "BREVO_SENDER_EMAIL must contain a valid email address",
    );
  }

  return { apiKey, senderEmail, senderName };
}

function normalizeRecipient(to) {
  const recipient =
    typeof to === "string"
      ? { email: to.trim() }
      : {
          email: typeof to?.email === "string" ? to.email.trim() : "",
          ...(typeof to?.name === "string" && to.name.trim()
            ? { name: to.name.trim() }
            : {}),
        };

  if (!EMAIL_PATTERN.test(recipient.email)) {
    throw new TypeError("A valid recipient email address is required");
  }

  return recipient;
}

async function readResponseBody(response) {
  try {
    return await response.json();
  } catch {
    return {};
  }
}

function createDeliveryError(response, responseBody) {
  const providerCode =
    typeof responseBody?.code === "string" ? responseBody.code : undefined;
  const providerMessage =
    typeof responseBody?.message === "string" ? responseBody.message : "";
  const isIpAuthorizationError =
    (response.status === 401 || response.status === 403) &&
    /(?:ip|unauthori[sz]ed|not authorized|permission)/i.test(providerMessage);

  return new EmailDeliveryError(
    isIpAuthorizationError
      ? "Brevo rejected the request because this server IP is not authorized"
      : `Brevo transactional email request failed with status ${response.status}`,
    {
      status: response.status,
      providerCode,
      isIpAuthorizationError,
    },
  );
}

async function sendTransactionalEmail({
  to,
  subject,
  htmlContent,
  textContent,
}) {
  const { apiKey, senderEmail, senderName } = getBrevoConfiguration();
  const recipient = normalizeRecipient(to);
  const normalizedSubject =
    typeof subject === "string" ? subject.trim() : "";
  const hasHtmlContent =
    typeof htmlContent === "string" && htmlContent.trim().length > 0;
  const hasTextContent =
    typeof textContent === "string" && textContent.trim().length > 0;

  if (!normalizedSubject) {
    throw new TypeError("Email subject is required");
  }

  if (!hasHtmlContent && !hasTextContent) {
    throw new TypeError("Email htmlContent or textContent is required");
  }

  const payload = {
    sender: { email: senderEmail, name: senderName },
    to: [recipient],
    subject: normalizedSubject,
    ...(hasHtmlContent ? { htmlContent } : {}),
    ...(hasTextContent ? { textContent } : {}),
  };

  let response;

  try {
    response = await fetch(BREVO_EMAIL_ENDPOINT, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new EmailDeliveryError("Brevo transactional email request failed", {
      providerCode: error?.name === "TimeoutError" ? "timeout" : "network_error",
    });
  }

  const responseBody = await readResponseBody(response);

  if (!response.ok) {
    throw createDeliveryError(response, responseBody);
  }

  return {
    messageId:
      typeof responseBody?.messageId === "string"
        ? responseBody.messageId
        : null,
  };
}

module.exports = {
  EmailConfigurationError,
  EmailDeliveryError,
  getEmailConfigurationStatus,
  sendTransactionalEmail,
};
