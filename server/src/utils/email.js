import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from './logger.js';

const createTransport = () => {
  return nodemailer.createTransport({
    host: config.email.host,
    port: config.email.port,
    secure: config.email.port === 465,
    auth: {
      user: config.email.user,
      pass: config.email.pass,
    },
  });
};

/**
 * Send email using nodemailer.
 * @param {Object} options - { to, subject, html, text }
 */
export const sendEmail = async (options) => {
  try {
    const transporter = createTransport();
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent to ${options.to}: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error('Email send failed:', error);
    throw error;
  }
};

export const emailTemplates = {
  passwordReset: (resetUrl, name) => ({
    subject: 'Reset Your HomeFood Password',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#e65c00;">HomeFood Password Reset</h2>
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <p>This link expires in <strong>15 minutes</strong>.</p>
        <a href="${resetUrl}" style="display:inline-block;background:#e65c00;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;margin:16px 0;">
          Reset Password
        </a>
        <p>If you didn't request this, please ignore this email.</p>
        <hr/>
        <small style="color:#888;">HomeFood — Homemade food, delivered with love.</small>
      </div>
    `,
    text: `Reset your HomeFood password: ${resetUrl}. Expires in 15 minutes.`,
  }),

  welcomeEmail: (name) => ({
    subject: `Welcome to HomeFood, ${name}! 🍽️`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#e65c00;">Welcome to HomeFood!</h2>
        <p>Hi ${name},</p>
        <p>You're now part of the HomeFood family. Discover amazing homemade food from talented cooks in your neighborhood!</p>
        <p>Happy eating! 🥘</p>
      </div>
    `,
    text: `Welcome to HomeFood, ${name}! Start discovering amazing homemade food near you.`,
  }),

  cookApproved: (name) => ({
    subject: 'Your Cook Account is Approved! 🎉',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#e65c00;">You're Approved!</h2>
        <p>Hi ${name},</p>
        <p>Great news! Your cook profile has been reviewed and approved. You can now:</p>
        <ul>
          <li>Create and manage your menu</li>
          <li>Accept orders from customers</li>
          <li>Set your availability</li>
        </ul>
        <p>Start cooking and earn today!</p>
      </div>
    `,
    text: `Congratulations ${name}! Your HomeFood cook account is approved. Start creating your menu!`,
  }),
};
