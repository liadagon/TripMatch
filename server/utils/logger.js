const SENSITIVE_KEY_PARTS = [
  "password",
  "authorization",
  "cookie",
  "token",
  "secret",
  "credential",
  "clientid",
  "email",
  "apikey",
  "privatekey",
  "signature",
  "databaseurl",
  "databaseuri",
  "mongodburi",
  "mongouri",
  "otp",
];

function redactString(value) {
  const environmentRedacted = Object.entries(process.env)
    .filter(
      ([key, secret]) =>
        isSensitiveKey(key) && typeof secret === "string" && secret.length >= 4,
    )
    .map(([, secret]) => secret)
    .sort((left, right) => right.length - left.length)
    .reduce(
      (redacted, secret) => redacted.split(secret).join("[REDACTED_SECRET]"),
      value,
    );

  return environmentRedacted
    .replace(
      /-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/gi,
      "[REDACTED_PRIVATE_KEY]",
    )
    .replace(/mongodb(?:\+srv)?:\/\/[^\s"'<>]+/gi, "[REDACTED_MONGODB_URI]")
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[REDACTED_JWT]")
    .replace(
      /([?&](?:api[_-]?key|token|secret|password)=)[^&\s]+/gi,
      "$1[REDACTED]",
    );
}

function isSensitiveKey(key) {
  const normalizedKey = String(key).replace(/[^a-z0-9]/gi, "").toLowerCase();
  return SENSITIVE_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

function sanitize(value, key = "", seen = new WeakSet(), depth = 0) {
  if (isSensitiveKey(key)) return "[REDACTED]";
  if (typeof value === "string") return redactString(value);
  if (value === null || ["number", "boolean"].includes(typeof value)) return value;
  if (typeof value === "bigint") return value.toString();
  if (value === undefined) return undefined;
  if (depth >= 5) return "[TRUNCATED]";

  if (value instanceof Error) {
    return {
      name: value.name,
      ...(value.code !== undefined ? { code: sanitize(value.code) } : {}),
      ...(value.status !== undefined ? { status: sanitize(value.status) } : {}),
      ...(value.statusCode !== undefined
        ? { statusCode: sanitize(value.statusCode) }
        : {}),
      ...(value.providerError !== undefined
        ? { providerError: sanitize(value.providerError) }
        : {}),
      ...(value.debugId !== undefined
        ? { debugId: sanitize(value.debugId) }
        : {}),
    };
  }

  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[CIRCULAR]";
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item, "", seen, depth + 1));
  }

  return Object.fromEntries(
    Object.entries(value)
      .map(([entryKey, entryValue]) => [
        entryKey,
        sanitize(entryValue, entryKey, seen, depth + 1),
      ])
      .filter(([, entryValue]) => entryValue !== undefined),
  );
}

function write(level, message, context) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactString(String(message)),
    ...(context === undefined ? {} : { context: sanitize(context) }),
  };
  const line = JSON.stringify(entry);

  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

module.exports = Object.freeze({
  info: (message, context) => write("info", message, context),
  warn: (message, context) => write("warn", message, context),
  error: (message, context) => write("error", message, context),
});
