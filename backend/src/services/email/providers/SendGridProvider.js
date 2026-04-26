import sgMail from '@sendgrid/mail';
import { EmailService } from '../EmailService.js';

export class SendGridProvider extends EmailService {
  constructor() {
    super();
    this.apiKey = process.env.SENDGRID_API_KEY;
    this.from = process.env.EMAIL_FROM || 'noreply@digifix.com';
  }

  async send({ to, subject, html, text }) {
    if (!this.apiKey || this.apiKey.includes('xxxxxxxxxxxx')) {
      console.warn(`[SendGridProvider] API key missing! Simulating sending email to [${to}]`);
      return;
    }
    sgMail.setApiKey(this.apiKey);
    await sgMail.send({ to, from: this.from, subject, html, text });
  }
}
