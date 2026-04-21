import nodemailer from 'nodemailer';

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'localhost',
  port: Number(process.env.EMAIL_PORT) || 1025,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: process.env.EMAIL_USER && process.env.EMAIL_PASSWORD ? {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  } : undefined,
});

export async function sendPasswordResetEmail(email, resetToken, resetUrl) {
  const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@nepaltrex.com',
      to: email,
      subject: 'Reset Your NepalTrex Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for your NepalTrex account.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetLink}" style="display: inline-block; margin: 20px 0; padding: 10px 20px; background-color: #f0b429; color: #102023; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Reset Password
          </a>
          <p>Or copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">${resetLink}</p>
          <p>This link expires in 24 hours.</p>
          <hr style="margin: 30px 0; color: #eee;">
          <p style="color: #999; font-size: 12px;">
            If you didn't request this, you can ignore this email. Your password won't change unless you click the link above.
          </p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Click the link below to reset your password:
        ${resetLink}
        
        This link expires in 24 hours.
        
        If you didn't request this, you can ignore this email.
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendStayOwnershipEmail(email, displayName, stayName, staySlug) {
  const stayUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/stays/${staySlug}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@nepaltrex.com',
      to: email,
      subject: `You've been assigned ownership of ${stayName} on NepalTrex`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Stay Ownership Assigned</h2>
          <p>Hi ${displayName || 'there'},</p>
          <p>You have been assigned as the owner of <strong>${stayName}</strong> on NepalTrex.</p>
          <p>You can now manage this stay from your dashboard.</p>
          <a href="${stayUrl}" style="display: inline-block; margin: 20px 0; padding: 10px 20px; background-color: #f0b429; color: #102023; text-decoration: none; border-radius: 4px; font-weight: bold;">
            View Stay
          </a>
          <p>Or copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">${stayUrl}</p>
          <hr style="margin: 30px 0; color: #eee;">
          <p style="color: #999; font-size: 12px;">
            If you believe this was a mistake, please contact us.
          </p>
        </div>
      `,
      text: `
        Stay Ownership Assigned

        Hi ${displayName || 'there'},

        You have been assigned as the owner of "${stayName}" on NepalTrex.
        You can manage it at: ${stayUrl}

        If you believe this was a mistake, please contact us.
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send stay ownership email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendVerificationEmail(email, verificationToken) {
  const verificationLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@nepaltrex.com',
      to: email,
      subject: 'Verify Your NepalTrex Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to NepalTrex!</h2>
          <p>Thank you for signing up. Please verify your email address to activate your account.</p>
          <a href="${verificationLink}" style="display: inline-block; margin: 20px 0; padding: 10px 20px; background-color: #f0b429; color: #102023; text-decoration: none; border-radius: 4px; font-weight: bold;">
            Verify Email
          </a>
          <p>Or copy and paste this link:</p>
          <p style="word-break: break-all; color: #666;">${verificationLink}</p>
        </div>
      `,
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return { success: false, error: error.message };
  }
}
