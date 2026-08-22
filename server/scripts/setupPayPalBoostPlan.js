const crypto = require("crypto");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const {
  PayPalApiError,
  PayPalConfigurationError,
  PayPalOAuthError,
  activatePayPalPlan,
  createPayPalPlan,
  createPayPalProduct,
  getPayPalConfigurationStatus,
  getPayPalPlan,
  getPayPalProduct,
  listPayPalPlans,
  listPayPalProducts,
  requestPayPalAccessToken,
} = require("../services/paypalService");

const PRODUCT = Object.freeze({
  name: "TripMatch Boost",
  description: "TripMatch premium monthly subscription",
  type: "SERVICE",
});
const PLAN_NAME = "TripMatch Boost Monthly";
const PLAN_AMOUNT = "100.00";
const PLAN_CURRENCY = "ILS";

function createRequestId(scope, values) {
  const hex = crypto
    .createHash("sha256")
    .update([scope, ...values].join("|"))
    .digest("hex")
    .slice(0, 32);

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function isExpectedProduct(product) {
  return (
    product?.name === PRODUCT.name &&
    product?.description === PRODUCT.description &&
    product?.type === PRODUCT.type
  );
}

function getRegularCycle(plan) {
  const cycles = Array.isArray(plan?.billing_cycles) ? plan.billing_cycles : [];
  return cycles.find((cycle) => cycle?.tenure_type === "REGULAR");
}

function hasTrial(plan) {
  return plan?.billing_cycles?.some((cycle) => cycle?.tenure_type === "TRIAL") ?? false;
}

function hasSetupFee(plan) {
  const setupFee = Number(plan?.payment_preferences?.setup_fee?.value ?? 0);
  return Number.isFinite(setupFee) && setupFee > 0;
}

function getPlanMetadata(plan) {
  const regularCycle = getRegularCycle(plan);
  const amount = Number(regularCycle?.pricing_scheme?.fixed_price?.value);

  return {
    amount: Number.isFinite(amount) ? amount.toFixed(2) : "",
    currency: regularCycle?.pricing_scheme?.fixed_price?.currency_code || "",
    interval: regularCycle?.frequency?.interval_unit || "",
    intervalCount: Number(regularCycle?.frequency?.interval_count),
    totalCycles: Number(regularCycle?.total_cycles),
    trial: hasTrial(plan),
    setupFee: hasSetupFee(plan),
  };
}

function isExpectedPlan(plan, productId) {
  const metadata = getPlanMetadata(plan);
  const cycles = Array.isArray(plan?.billing_cycles) ? plan.billing_cycles : [];

  return (
    plan?.product_id === productId &&
    plan?.name === PLAN_NAME &&
    cycles.length === 1 &&
    metadata.interval === "MONTH" &&
    metadata.intervalCount === 1 &&
    metadata.totalCycles === 0 &&
    metadata.amount === PLAN_AMOUNT &&
    metadata.currency === PLAN_CURRENCY &&
    !metadata.trial &&
    !metadata.setupFee
  );
}

async function findExistingProduct(accessToken) {
  const configuredId = process.env.PAYPAL_PRODUCT_ID?.trim();

  if (configuredId) {
    const product = await getPayPalProduct(accessToken, configuredId);
    if (!isExpectedProduct(product)) {
      throw new PayPalConfigurationError(
        "PAYPAL_PRODUCT_ID does not reference the expected TripMatch Boost Sandbox product",
      );
    }
    return product;
  }

  const products = await listPayPalProducts(accessToken);

  for (const summary of products) {
    if (summary?.name !== PRODUCT.name) continue;
    const product = await getPayPalProduct(accessToken, summary.id);
    if (isExpectedProduct(product)) return product;
  }

  return null;
}

async function getOrCreateProduct(accessToken) {
  const existingProduct = await findExistingProduct(accessToken);
  if (existingProduct) return { product: existingProduct, action: "REUSED" };

  const requestId = createRequestId("tripmatch-boost-product-v1", [
    PRODUCT.name,
    PRODUCT.description,
    PRODUCT.type,
  ]);
  const createdProduct = await createPayPalProduct(
    accessToken,
    PRODUCT,
    requestId,
  );
  const product = await getPayPalProduct(accessToken, createdProduct.id);

  if (!isExpectedProduct(product)) {
    throw new PayPalApiError("Created PayPal Sandbox product failed verification", {
      providerError: "product_verification_failed",
    });
  }

  return { product, action: "CREATED" };
}

async function findExistingPlan(accessToken, productId) {
  const configuredId = process.env.PAYPAL_PLAN_ID_BOOST?.trim();

  if (configuredId) {
    const plan = await getPayPalPlan(accessToken, configuredId);
    if (!isExpectedPlan(plan, productId)) {
      throw new PayPalConfigurationError(
        "PAYPAL_PLAN_ID_BOOST does not reference the expected TripMatch Boost Sandbox plan",
      );
    }
    return plan;
  }

  const plans = await listPayPalPlans(accessToken, productId);

  for (const summary of plans) {
    if (summary?.name !== PLAN_NAME) continue;
    const plan = await getPayPalPlan(accessToken, summary.id);
    if (isExpectedPlan(plan, productId)) return plan;
  }

  return null;
}

function buildPlan(productId) {
  return {
    product_id: productId,
    name: PLAN_NAME,
    billing_cycles: [
      {
        frequency: {
          interval_unit: "MONTH",
          interval_count: 1,
        },
        tenure_type: "REGULAR",
        sequence: 1,
        total_cycles: 0,
        pricing_scheme: {
          fixed_price: {
            value: PLAN_AMOUNT,
            currency_code: PLAN_CURRENCY,
          },
        },
      },
    ],
    payment_preferences: {
      auto_bill_outstanding: true,
    },
  };
}

async function getOrCreatePlan(accessToken, productId) {
  const existingPlan = await findExistingPlan(accessToken, productId);
  let action = "REUSED";
  let plan = existingPlan;

  if (!plan) {
    const requestId = createRequestId("tripmatch-boost-plan-v1", [
      productId,
      PLAN_NAME,
      PLAN_AMOUNT,
      PLAN_CURRENCY,
    ]);
    const createdPlan = await createPayPalPlan(
      accessToken,
      buildPlan(productId),
      requestId,
    );
    plan = await getPayPalPlan(accessToken, createdPlan.id);
    action = "CREATED";
  }

  if (!isExpectedPlan(plan, productId)) {
    throw new PayPalApiError("PayPal Sandbox plan failed verification", {
      providerError: "plan_verification_failed",
    });
  }

  if (plan.status !== "ACTIVE") {
    await activatePayPalPlan(accessToken, plan.id);
    plan = await getPayPalPlan(accessToken, plan.id);
  }

  if (plan.status !== "ACTIVE" || !isExpectedPlan(plan, productId)) {
    throw new PayPalApiError("PayPal Sandbox plan is not active and usable", {
      providerError: "plan_not_active",
    });
  }

  return { plan, action };
}

async function setupPayPalBoostPlan() {
  const configuration = getPayPalConfigurationStatus();

  if (!configuration.sandboxBaseUrl) {
    throw new PayPalConfigurationError(
      "PayPal Boost setup is restricted to the Sandbox base URL",
    );
  }

  console.log("PayPal Sandbox guard: PASS");

  const { accessToken } = await requestPayPalAccessToken();
  const { product, action: productAction } =
    await getOrCreateProduct(accessToken);
  const { plan, action: planAction } = await getOrCreatePlan(
    accessToken,
    product.id,
  );
  const metadata = getPlanMetadata(plan);

  console.log("PayPal Boost Product: PASS");
  console.log(`Product action: ${productAction}`);
  console.log(`Product ID: ${product.id}`);
  console.log(`Product name: ${product.name}`);
  console.log(`Product type: ${product.type}`);
  console.log("PayPal Boost Plan: PASS");
  console.log(`Plan action: ${planAction}`);
  console.log(`Plan ID: ${plan.id}`);
  console.log(`Status: ${plan.status}`);
  console.log(`Currency: ${metadata.currency}`);
  console.log(`Amount: ${metadata.amount}`);
  console.log(`Interval: ${metadata.interval}`);
  console.log(`Trial: ${metadata.trial ? "YES" : "NO"}`);
  console.log(`Setup fee: ${metadata.setupFee ? "YES" : "NO"}`);
}

setupPayPalBoostPlan().catch((error) => {
  console.error("PayPal Boost Product/Plan setup: FAIL");

  if (
    error instanceof PayPalConfigurationError ||
    error instanceof PayPalOAuthError ||
    error instanceof PayPalApiError
  ) {
    console.error(error.message, {
      status: error.status,
      providerError: error.providerError,
      debugId: error.debugId,
      path: error.path,
      details: error.details,
    });
  } else {
    console.error("PayPal Boost setup failed safely");
  }

  process.exitCode = 1;
});
