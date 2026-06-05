import { env } from '../config/env';
import { logger } from '../middleware/logger';

/**
 * Real Notification Service
 * Uses Fast2SMS for SMS delivery when FAST2SMS_API_KEY is configured.
 * Falls back to structured console logging in development / when key is missing.
 *
 * Fast2SMS DLT-compliant API: https://www.fast2sms.com/docs/reseller
 */

export class NotificationService {

  // ─── SMS via Fast2SMS ──────────────────────────────────────────────────────
  static async sendSMS(phone: string, message: string): Promise<void> {
    // Sanitise: accept 10-digit or +91 prefixed numbers
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    if (!env.FAST2SMS_API_KEY) {
      logger.info({ phone: cleanPhone, message }, '[SMS] No API key configured — message logged only');
      return;
    }

    try {
      const body = new URLSearchParams({
        authorization: env.FAST2SMS_API_KEY,
        message,
        language: 'english',
        route: 'q',              // Quick / Transactional route
        numbers: cleanPhone,
      });

      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cache-Control': 'no-cache',
        },
        body: body.toString(),
      });

      const json = await response.json() as { return: boolean; request_id?: string; message?: string[] };

      if (json.return) {
        logger.info({ phone: cleanPhone, requestId: json.request_id }, '[SMS] Sent successfully via Fast2SMS');
      } else {
        logger.warn({ phone: cleanPhone, response: json }, '[SMS] Fast2SMS rejected the request');
      }
    } catch (err) {
      logger.error({ err, phone: cleanPhone }, '[SMS] Failed to deliver SMS — network or API error');
      // Do NOT re-throw — notification failure must never crash the request lifecycle
    }
  }

  // ─── WhatsApp (future integration placeholder) ─────────────────────────────
  // To activate: sign up at https://www.wati.io or use the Meta WhatsApp Cloud API
  static async sendWhatsApp(
    phone: string,
    templateName: string,
    params: Record<string, string>
  ): Promise<void> {
    const cleanPhone = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10);

    // When WHATSAPP_API_KEY / WATI integration is added, call the API here.
    // For now, we log the intent clearly so it is easy to wire up.
    logger.info(
      { phone: cleanPhone, templateName, params },
      '[WhatsApp] Integration not yet configured — message logged for audit'
    );
  }
}

