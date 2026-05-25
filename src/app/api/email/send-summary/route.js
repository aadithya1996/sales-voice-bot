import { NextResponse } from 'next/server';
import { buildEmailHtml, buildEmailText } from '@/lib/email-templates';

/**
 * Email Summary API — Preview Only (SendGrid removed)
 * Returns email preview data for client-side mailto/copy/download.
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const { to, subject, actions, callStats, summary, repName } = body;

    if (!to || !to.includes('@')) {
      return NextResponse.json({
        success: false,
        error: 'Valid recipient email is required'
      }, { status: 400 });
    }

    const dealsDiscussed = summary?.dealsDiscussed || [];
    const actionsList = actions || [];
    const completedActions = actionsList.filter(a => a.status === 'completed');
    const pendingActions = actionsList.filter(a => a.status === 'pending');

    const emailHtml = buildEmailHtml({
      subject,
      dealsDiscussed,
      actionsList,
      completedActions,
      pendingActions,
      callStats,
      summary,
      repName
    });

    const emailText = buildEmailText({
      subject,
      dealsDiscussed,
      actionsList,
      completedActions,
      pendingActions,
      callStats,
      summary,
      repName
    });

    return NextResponse.json({
      success: true,
      preview: true,
      message: 'Email preview generated. Use mailto, copy, or download to send.',
      data: {
        to,
        subject,
        html: emailHtml,
        text: emailText,
        stats: {
          dealsDiscussed: dealsDiscussed.length,
          actionsQueued: actionsList.length,
          actionsCompleted: completedActions.length,
          callDuration: callStats?.duration || 0
        }
      }
    });

  } catch (err) {
    console.error('Error processing email request:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
