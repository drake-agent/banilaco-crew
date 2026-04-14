/**
 * Barrel export for reminders module
 */

export { ReminderEngine } from './reminder-engine';
export type { ReminderResult } from './reminder-engine';

export { renderTemplate } from './templates';

export type { INotificationSender } from './notification-sender';
export {
  ConsoleNotificationSender,
  EmailNotificationSender,
  CompositeNotificationSender,
  TikTokDMSender,
  createNotificationSender,
} from './notification-sender';
