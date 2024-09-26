import nodemailer from "nodemailer";
import config from "../config/env_config.js";

const transporter = nodemailer.createTransport({
  service: "Gmail", // Or any other email service
  auth: {
    user: config.email_username,
    pass: config.email_password,
  },
});

export const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${config.base_url}/api/auth/verify-email?token=${token}`;
  const mailOptions = {
    from: config.email_username,
    to: email,
    subject: "Verify Your Email",
    text: `Please verify your email by clicking the following link: ${verificationUrl}`,
  };
  await transporter.sendMail(mailOptions);
};
