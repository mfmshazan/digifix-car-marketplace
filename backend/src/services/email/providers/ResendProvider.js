import { Resend } from 'resend';
import { EmailService } from '../EmailService.js';

export class ResendProvider extends EmailService {
  constructor() {
    super();
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM || 'noreply@digifix.com';
  }

  async send({ to, subject, html, text }) {
    if (!this.apiKey || this.apiKey.includes('xxxxxxxxxxxx')) {
      console.warn(`[ResendProvider] API key missing! Simulating sending email to [${to}]`);
      return;
    }
    console.log(`[ResendProvider] Calling Resend API to [${to}]...`);
    const client = new Resend(this.apiKey);
    const { data, error } = await client.emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`[ResendProvider] API Error:`, error);
      throw new Error(`Resend error: ${error.message}`);
    }
    console.log(`[ResendProvider] Resend API Success:`, data?.id);
  }
}
