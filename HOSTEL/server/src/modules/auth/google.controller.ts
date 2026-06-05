import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import db from '../../config/db';
import { env } from '../../config/env';
import { logger } from '../../middleware/logger';
import { sendSuccess } from '../../utils/response';

const oAuth2Client = new OAuth2Client(
  env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_ID',
  env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_SECRET',
  env.FRONTEND_URL ? `${env.FRONTEND_URL}/warden` : 'http://localhost:5173/warden'
);

// We need a specific redirect URI for the backend callback, but for single-page apps
// the flow is often: Frontend gets auth code -> sends to backend.
// Or Backend generates URL -> User clicks -> Redirects to Backend callback -> Backend redirects to frontend.
// Let's use the latter approach.
const BACKEND_CALLBACK_URL = `http://localhost:3000/api/v1/auth/google/callback`;

const getClient = () => {
  return new OAuth2Client(
    env.GOOGLE_CLIENT_ID || 'PLACEHOLDER_ID',
    env.GOOGLE_CLIENT_SECRET || 'PLACEHOLDER_SECRET',
    BACKEND_CALLBACK_URL
  );
};

export const getAuthUrl = async (req: any, res: Response) => {
  try {
    const client = getClient();
    const authorizeUrl = client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://mail.google.com/'],
      prompt: 'consent', // Force consent to get a refresh token
      state: req.user.id, // Pass the warden's user ID as state to link it in the callback
    });
    
    sendSuccess(res, { url: authorizeUrl });
  } catch (error) {
    logger.error(error, 'Error generating Google Auth URL:');
    res.status(500).json({ success: false, error: 'Failed to generate auth URL' });
  }
};

export const handleAuthCallback = async (req: Request, res: Response) => {
  try {
    const code = req.query.code as string;
    const wardenId = req.query.state as string;

    if (!code || !wardenId) {
       res.redirect(`http://localhost:5173/warden?error=missing_params`);
       return;
    }

    const client = getClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // Get user info to save email
    const url = 'https://gmail.googleapis.com/gmail/v1/users/me/profile';
    const response = await client.request({ url });
    const emailAddress = (response.data as any).emailAddress;

    if (tokens.refresh_token) {
      await db.user.update({
        where: { id: wardenId },
        data: {
          googleEmail: emailAddress,
          googleRefreshToken: tokens.refresh_token,
        },
      });
      logger.info(`Google account connected for Warden ${wardenId}`);
      res.redirect(`http://localhost:5173/warden?google_success=true`);
    } else {
      logger.warn(`No refresh token received for Warden ${wardenId}`);
      // If we didn't get a refresh token, they need to revoke access and try again
      res.redirect(`http://localhost:5173/warden?error=no_refresh_token`);
    }
  } catch (error: any) {
    logger.error(error, 'Error in Google Auth callback:');
    const errorMessage = error?.message || 'unknown_error';
    res.redirect(`http://localhost:5173/warden?error=oauth_failed&details=${encodeURIComponent(errorMessage)}`);
  }
};

export const disconnectGoogle = async (req: any, res: Response) => {
  try {
    const wardenId = req.user.id;
    await db.user.update({
      where: { id: wardenId },
      data: {
        googleEmail: null,
        googleRefreshToken: null,
      },
    });
    sendSuccess(res, null, 'Google account disconnected');
  } catch (error) {
    logger.error(error, 'Error disconnecting Google account:');
    res.status(500).json({ success: false, error: 'Failed to disconnect account' });
  }
};
