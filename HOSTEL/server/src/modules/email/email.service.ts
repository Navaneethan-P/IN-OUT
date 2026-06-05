import nodemailer from 'nodemailer';
import { google } from 'googleapis';
import db from '../../config/db';
import { logger } from '../../middleware/logger';
import { env } from '../../config/env';

const OAuth2 = google.auth.OAuth2;

const createTransporter = async (wardenId: string) => {
  const warden = await db.user.findUnique({ where: { id: wardenId } });
  if (!warden || !warden.googleEmail || !warden.googleRefreshToken) {
    throw new Error('Google Account not connected');
  }

  const oauth2Client = new OAuth2(
    env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_ID',
    env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_SECRET',
    'https://developers.google.com/oauthplayground'
  );

  oauth2Client.setCredentials({
    refresh_token: warden.googleRefreshToken,
  });

  const accessToken = await new Promise<string>((resolve, reject) => {
    oauth2Client.getAccessToken((err: Error | null, token: string | null | undefined) => {
      if (err) {
        logger.error(err, '[EMAIL ERROR] Failed to create access token:');
        reject('Failed to create access token');
      }
      resolve(token as string);
    });
  });

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: warden.googleEmail,
      accessToken,
      clientId: env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_ID',
      clientSecret: env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_SECRET',
      refreshToken: warden.googleRefreshToken,
    },
  });

  return { transporter, emailAddress: warden.googleEmail };
};

export const sendGatePassEmail = async (
  wardenId: string,
  studentEmail: string,
  studentName: string,
  rollNumber: string,
  room: string,
  outDatetime: Date,
  inDatetime: Date,
  reason: string
) => {
  let transporter, emailAddress;
  try {
    const res = await createTransporter(wardenId);
    transporter = res.transporter;
    emailAddress = res.emailAddress;
  } catch (err) {
    logger.warn('[EMAIL ERROR] ' + err);
    return;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Hostel Gate Pass Ticket</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${studentName},</p>
        <p>This is to confirm that your request has been <strong>APPROVED</strong> by the Warden.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Roll Number:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${rollNumber}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Room:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${room}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Reason:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reason}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Out Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(outDatetime).toLocaleString()}</td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>In Time:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(inDatetime).toLocaleString()}</td></tr>
        </table>
        
        <p style="margin-top: 20px; color: #555;">Please present this email or your student ID at the security gate.</p>
      </div>
      <div style="background-color: #f3f4f6; color: #777; text-align: center; padding: 10px; font-size: 12px;">
        Hostel Management System
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Hostel Warden" <${emailAddress}>`,
      to: studentEmail,
      subject: `Approved: Gate Pass for ${studentName} (${rollNumber})`,
      html: htmlContent,
    });
    logger.info(`Gate Pass email sent for student ${rollNumber}`);
  } catch (error) {
    logger.error(error, `Failed to send Gate Pass email for ${rollNumber}:`);
    throw new Error('Failed to send email with Google OAuth.');
  }
};

export const sendRejectionEmail = async (
  wardenId: string,
  studentEmail: string,
  studentName: string,
  rollNumber: string,
  rejectionReason: string
) => {
  let transporter, emailAddress;
  try {
    const res = await createTransporter(wardenId);
    transporter = res.transporter;
    emailAddress = res.emailAddress;
  } catch (err) {
    logger.warn('[EMAIL ERROR] ' + err);
    return;
  }

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">Request Rejected</h2>
      </div>
      <div style="padding: 20px;">
        <p>Dear ${studentName},</p>
        <p>Your outing/leave request has been <strong>REJECTED</strong> by the Warden.</p>
        
        <div style="background-color: #fee2e2; border-left: 4px solid #ef4444; padding: 10px 15px; margin-top: 20px;">
          <p style="margin: 0; color: #991b1b;"><strong>Warden's Reason:</strong></p>
          <p style="margin: 5px 0 0 0; color: #b91c1c;">${rejectionReason}</p>
        </div>
        
        <p style="margin-top: 20px; color: #555;">Please meet the Warden in person if you have further questions.</p>
      </div>
      <div style="background-color: #f3f4f6; color: #777; text-align: center; padding: 10px; font-size: 12px;">
        Hostel Management System
      </div>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: `"Hostel Warden" <${emailAddress}>`,
      to: studentEmail,
      subject: `Rejected: Request for ${studentName} (${rollNumber})`,
      html: htmlContent,
    });
    logger.info(`Rejection email sent for student ${rollNumber}`);
  } catch (error) {
    logger.error(error, `Failed to send Rejection email for ${rollNumber}:`);
    throw new Error('Failed to send email with Google OAuth.');
  }
};
