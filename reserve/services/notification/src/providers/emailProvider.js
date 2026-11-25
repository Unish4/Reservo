import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { ENV } from "../config/env.js";
import logger from "../config/logger.js";

// WHY a provider module: notificationService only knows "send this email". It
// doesn't know about SMTP. Swapping to Resend/SES/SendGrid later means
// changing this one file.

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      // 465 = implicit TLS. 587 = STARTTLS, which nodemailer upgrades itself.
      secure: ENV.SMTP_PORT === 465,
      auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASS },
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, text, html }) {
  if (ENV.EMAIL_PROVIDER === "console") {
    // Dev mode: nothing leaves the machine, you just see what would be sent.
    logger.info({ to, subject, text }, "email.console");
    return { messageId: `console-${randomUUID()}` };
  }

  const info = await getTransporter().sendMail({
    from: ENV.EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
  return { messageId: info.messageId };
}

// Called once at boot. Deliberately warns instead of crashing: an SMTP outage
// shouldn't stop the service from consuming, and failed sends are retried/DLQ'd.
export async function verifyEmailProvider() {
  if (ENV.EMAIL_PROVIDER !== "smtp") return;
  try {
    await getTransporter().verify();
    logger.info({ host: ENV.SMTP_HOST }, "email.smtp.verified");
  } catch (err) {
    logger.error({ message: err.message }, "email.smtp.verify.failed");
  }
}
