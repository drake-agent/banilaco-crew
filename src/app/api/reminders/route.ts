import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';
import { ReminderEngine } from '@/lib/reminders/reminder-engine';
import { CompositeNotificationSender, ConsoleNotificationSender, EmailNotificationSender } from '@/lib/reminders/notification-sender';
import { renderTemplate } from '@/lib/reminders/templates';
import { SampleShipment, Creator } from '@/types/database';

// Verify cron secret for scheduled tasks
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret) {
    console.error('CRITICAL: CRON_SECRET not configured. Reminders will not process.');
    return false;
  }

  return authHeader === `Bearer ${expectedSecret}`;
}

/**
 * GET /api/reminders
 * Return reminder stats (how many at each stage)
 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // SECURITY: Verify authentication (VULN-006)
  const authHeader = request.headers.get('authorization');
  const sessionCookie = request.cookies.get('sb-access-token')?.value;
  if (!authHeader && !sessionCookie) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    // Get counts by status
    const { data: statusCounts, error: countError } = await supabase
      .from('sample_shipments')
      .select('status', { count: 'exact' });

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    // Count by status
    const stats = {
      delivered: 0,
      reminder_1: 0,
      reminder_2: 0,
      no_response: 0,
      content_posted: 0,
      pending_content: 0,
    };

    if (statusCounts) {
      for (const record of statusCounts) {
        if (record.status === 'delivered') stats.delivered++;
        else if (record.status === 'reminder_1') stats.reminder_1++;
        else if (record.status === 'reminder_2') stats.reminder_2++;
        else if (record.status === 'no_response') stats.no_response++;
        else if (record.status === 'content_posted') stats.content_posted++;
      }
    }

    // Get pending content (delivered without content posted or reminders)
    const { count: pendingCount } = await supabase
      .from('sample_shipments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'delivered')
      .is('content_posted_at', null);

    stats.pending_content = pendingCount || 0;

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching reminder stats:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reminders
 * Actions:
 * - { action: 'process' } → Run reminder engine (requires CRON_SECRET)
 * - { action: 'send_manual', shipment_id, template } → Send manual reminder
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  if (action === 'process') {
    // Verify cron authentication
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return handleProcessReminders();
  }

  if (action === 'send_manual') {
    return handleSendManual(body);
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

/**
 * Process all reminders
 */
async function handleProcessReminders() {
  try {
    // Create notification sender
    // In production, use CompositeNotificationSender; in dev, use console
    const isDev = process.env.NODE_ENV === 'development';
    const notificationSender = isDev
      ? new ConsoleNotificationSender()
      : new CompositeNotificationSender(
          new ConsoleNotificationSender(),
          new EmailNotificationSender()
        );

    // Process reminders
    const engine = new ReminderEngine(notificationSender);
    const result = await engine.processReminders();

    return NextResponse.json(
      {
        success: true,
        message: 'Reminders processed',
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing reminders:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Send manual reminder
 */
async function handleSendManual(body: any) {
  const { shipment_id, template } = body;

  if (!shipment_id || !template) {
    return NextResponse.json(
      { error: 'shipment_id and template are required' },
      { status: 400 }
    );
  }

  try {
    const supabase = createServerClient();

    // Fetch shipment with creator
    const { data: shipment, error } = await supabase
      .from('sample_shipments')
      .select('*, creator:creators(id, tiktok_handle, display_name, email, tier, commission_rate)')
      .eq('id', shipment_id)
      .single();

    if (error || !shipment) {
      return NextResponse.json({ error: 'Shipment not found' }, { status: 404 });
    }

    const typedShipment = shipment as SampleShipment & { creator: Creator };
    const creator = typedShipment.creator;

    // Render template
    const daysSinceDelivery = typedShipment.delivered_at
      ? Math.floor((Date.now() - new Date(typedShipment.delivered_at).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const message = renderTemplate(template, {
      creator_name: creator.display_name || creator.tiktok_handle,
      tiktok_handle: creator.tiktok_handle,
      set_type: typedShipment.set_type || 'sample',
      days_since_delivery: daysSinceDelivery.toString(),
      commission_rate: creator.commission_rate.toString(),
      tier: creator.tier,
    });

    // Send via console in dev, or composite sender in prod
    const isDev = process.env.NODE_ENV === 'development';
    const notificationSender = isDev
      ? new ConsoleNotificationSender()
      : new CompositeNotificationSender(
          new ConsoleNotificationSender(),
          new EmailNotificationSender()
        );

    // Send DM
    const dmSent = await notificationSender.sendDM(creator.tiktok_handle, message);

    // Send email if available
    let emailSent = false;
    if (creator.email) {
      emailSent = await notificationSender.sendEmail(
        creator.email,
        `Banilaco Sample Update`,
        message
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Manual reminder sent',
        dmSent,
        emailSent,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
