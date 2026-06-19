import { ResendProvider } from './providers/ResendProvider.js';
import { SendGridProvider } from './providers/SendGridProvider.js';

/**
 * Returns a send() function that tries the primary provider
 * and automatically falls back to secondary on failure.
 */
function createEmailService() {
  const primaryName = process.env.EMAIL_PROVIDER || 'resend';
  const fallbackName = process.env.FALLBACK_EMAIL_PROVIDER || 'sendgrid';

  const providerMap = {
    resend: () => new ResendProvider(),
    sendgrid: () => new SendGridProvider(),
  };

  const primary = providerMap[primaryName]?.();
  const fallback = providerMap[fallbackName]?.();

  if (!primary) throw new Error(`Unknown EMAIL_PROVIDER: "${primaryName}"`);

  return {
    /**
     * @param {{ to: string, subject: string, html: string, text?: string }} options
     */
    async send(options) {
      try {
        await primary.send(options);
        console.log(`[EmailService] Sent via ${primaryName}`);
      } catch (primaryErr) {
        console.error(`[EmailService] Primary (${primaryName}) failed:`, primaryErr.message);
        if (fallback) {
          console.log(`[EmailService] Falling back to ${fallbackName}...`);
          await fallback.send(options);
          console.log(`[EmailService] Sent via ${fallbackName} (fallback)`);
        } else {
          throw primaryErr;
        }
      }
    },
  };
}

// Singleton instance
export const emailService = createEmailService();
