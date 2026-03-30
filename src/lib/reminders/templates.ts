/**
 * Reminder templates for DM and email notifications
 */

export const reminder1_dm = `Hi {{creator_name}}! 👋

We wanted to check in on your {{set_type}} sample from Banilaco. Did you receive it?

We'd love to see your creative take on the products! Your {{commission_rate}}% commission is waiting for you. 💰

Let us know if you have any questions or need product links to post.

- Banilaco Crew`;

export const reminder1_email = `Subject: Your Banilaco Sample Arrived!

Hi {{creator_name}},

We hope you received your {{set_type}} sample from Banilaco! It's been {{days_since_delivery}} days since delivery, and we'd love to see your content.

As a {{tier}} tier creator, you're earning {{commission_rate}}% commission on every TikTok Shop purchase your followers make through your link.

If you have any questions about the products or need help getting started, just reply to this email or DM us on TikTok.

Looking forward to seeing your content!

Best regards,
Banilaco Crew
crew@banilaco.com`;

export const reminder2_dm = `Hey {{creator_name}}! 🎬

Just a friendly reminder about your {{set_type}} sample from Banilaco. It's been {{days_since_delivery}} days, and we're ready to activate your {{commission_rate}}% commission once you post!

This is a great opportunity to earn passive income while sharing products you love. 💸

Reply here or check your email if you need anything from us!

- Banilaco Crew`;

export const reminder2_email = `Subject: Last Reminder: Post Your Banilaco Content & Earn Commissions

Hi {{creator_name}},

We noticed you haven't posted about your Banilaco {{set_type}} sample yet. Your {{commission_rate}}% commission is waiting!

It's been {{days_since_delivery}} days since delivery, and this is our final reminder before we move forward. As a {{tier}} creator, you have the power to generate sales and earn real money on every purchase.

If you're having any issues with the products or need product details/links, please reach out immediately.

We're here to support you!

Best regards,
Banilaco Crew
crew@banilaco.com`;

export const content_posted_thanks = `OMG {{creator_name}}! 🎉🎉🎉

We just saw your Banilaco content - absolutely amazing! Your energy and creativity are exactly what we love about working with you.

Your {{commission_rate}}% commission is now LIVE for every sale from your video. Let's keep this momentum going!

Thanks for being an awesome part of the Banilaco crew! 💚

- The Banilaco Team`;

export const tier_upgrade_congrats = `Congrats {{creator_name}}! 🚀

Your performance has been incredible, and we're excited to announce you've been upgraded to {{tier}} tier!

This means:
- Higher {{commission_rate}}% commission rate
- Priority access to premium sample sets
- Exclusive collaboration opportunities
- VIP support from our team

We can't wait to see what you create next!

Welcome to the elite tier of Banilaco creators! 💎

- The Banilaco Team`;

/**
 * Render a template with variables
 */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  let result = template;

  for (const [key, value] of Object.entries(vars)) {
    const placeholder = `{{${key}}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  }

  return result;
}
