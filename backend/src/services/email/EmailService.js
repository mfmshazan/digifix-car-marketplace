/**
 * Abstract EmailService interface.
 * All providers must implement the `send` method.
 */
export class EmailService {
  /**
   * @param {Object} options
   * @param {string} options.to
   * @param {string} options.subject
   * @param {string} options.html
   * @param {string} [options.text]
   */
  async send({ to, subject, html, text }) {
    throw new Error('EmailService.send() must be implemented by a provider');
  }
}
