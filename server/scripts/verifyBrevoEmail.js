const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const {
  EmailConfigurationError,
  EmailDeliveryError,
  getEmailConfigurationStatus,
  sendTransactionalEmail,
} = require("../services/emailService");

async function verifyBrevoEmail() {
  const configuration = getEmailConfigurationStatus();

  console.log("Brevo email configuration", configuration);

  if (
    !configuration.apiKeyConfigured ||
    !configuration.senderEmailConfigured ||
    !configuration.testEmailConfigured
  ) {
    console.log(
      "Brevo email was not sent because required local configuration is missing.",
    );
    return;
  }

  await sendTransactionalEmail({
    to: process.env.BREVO_TEST_EMAIL,
    subject: "TripMatch email test",
    htmlContent:
      "<p>TripMatch transactional email infrastructure is working.</p>",
    textContent: "TripMatch transactional email infrastructure is working.",
  });

  console.log("One TripMatch transactional test email was accepted by Brevo.");
}

verifyBrevoEmail().catch((error) => {
  if (error instanceof EmailConfigurationError) {
    console.error(error.message);
  } else if (
    error instanceof EmailDeliveryError &&
    error.isIpAuthorizationError
  ) {
    console.error(
      "Brevo blocked the test because this public IP is not authorized. Authorize the IP in Brevo without disabling IP security, then retry.",
    );
  } else if (error instanceof EmailDeliveryError) {
    console.error(error.message, {
      status: error.status,
      providerCode: error.providerCode,
    });
  } else {
    console.error("Brevo email verification failed safely.");
  }

  process.exitCode = 1;
});
