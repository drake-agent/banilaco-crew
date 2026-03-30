/**
 * Notification sender interface and implementations
 */

export interface INotificationSender {
  sendDM(handle: string, message: string): Promise<boolean>;
  sendEmail(email: string, subject: string, body: string): Promise<boolean>;
}

/**
 * Console-based notification sender for development/testing
 */
export class ConsoleNotificationSender implements INotificationSender {
  async sendDM(handle: string, message: string): Promise<boolean> {
    console.log(`[DM -> @${handle}]`);
    console.log(message);
    console.log('---');
    return true;
  }

  async sendEmail(email: string, subject: string, body: string): Promise<boolean> {
    console.log(`[EMAIL -> ${email}]`);
    console.log(`Subject: ${subject}`);
    console.log('---');
    console.log(body);
    console.log('---');
    return true;
  }
}

/**
 * Email-based notification sender using Resend API
 */
export class EmailNotificationSender implements INotificationSender {
  private apiKey: string;
  private fromEmail: string;

  constructor(apiKey?: string, fromEmail?: string) {
    this.apiKey = apiKey || process.env.RESEND_API_KEY || '';
    this.fromEmail = fromEmail || process.env.RESEND_FROM_EMAIL || 'crew@banilaco.com';
  }

  async sendDM(handle: string, message: string): Promise<boolean> {
    // DMs are not sent via email in this implementation
    // In a real system, this would integrate with TikTok's messaging API
    console.log(`[DM -> @${handle}] (not implemented)`);
    console.log(message);
    return true;
  }

  async sendEmail(email: string, subject: string, body: string): Promise<boolean> {
    if (!this.apiKey) {
      console.warn('RESEND_API_KEY not configured, skipping email');
      return false;
    }

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: email,
          subject,
          html: this.escapeHtml(body).replace(/\n/g, '<br />'),
        }),
      });

      if (!response.ok) {
        console.error(`Resend API error: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error sending email via Resend:', error);
      return false;
    }
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (char) => map[char]);
  }
}

/**
 * Composite notification sender that sends both DM and email
 */
export class CompositeNotificationSender implements INotificationSender {
  private dmSender: INotificationSender;
  private emailSender: INotificationSender;

  constructor(dmSender: INotificationSender, emailSender: INotificationSender) {
    this.dmSender = dmSender;
    this.emailSender = emailSender;
  }

  async sendDM(handle: string, message: string): Promise<boolean> {
    try {
      return await this.dmSender.sendDM(handle, message);
    } catch (error) {
      console.error(`Error in DM sender: ${error}`);
      return false;
    }
  }

  async sendEmail(email: string, subject: string, body: string): Promise<boolean> {
    try {
      return await this.emailSender.sendEmail(email, subject, body);
    } catch (error) {
      console.error(`Error in email sender: ${error}`);
      return false;
    }
  }
}

/**
 * TikTok DM sender (placeholder implementation)
 * In a real system, this would use TikTok's messaging API
 */
export class TikTokDMSender implements INotificationSender {
  async sendDM(handle: string, message: string): Promise<boolean> {
    // TODO: Implement TikTok messaging API integration
    // This would require TikTok API credentials and proper OAuth flow
    console.log(`[TikTok DM -> @${handle}] (requires API implementation)`);
    console.log(message);
    return true;
  }

  async sendEmail(_email: string, _subject: string, _body: string): Promise<boolean> {
    // TikTok DM sender doesn't send emails
    return false;
  }
}

/**
 * Factory function to create appropriate notification sender based on environment
 */
export function createNotificationSender(
  mode: 'console' | 'email' | 'composite' = 'composite'
): INotificationSender {
  if (mode === 'console') {
    return new ConsoleNotificationSender();
  }

  if (mode === 'email') {
    return new EmailNotificationSender();
  }

  // Composite: DM via console, Email via Resend
  return new CompositeNotificationSender(
    new ConsoleNotificationSender(),
    new EmailNotificationSender()
  );
}
