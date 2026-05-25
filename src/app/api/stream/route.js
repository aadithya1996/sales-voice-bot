export const dynamic = 'force-dynamic';

import thoughtEmitter from '../../../lib/thought-emitter';

/**
 * SSE Stream API
 * Serves Server-Sent Events to the Dashboard for real-time updates.
 *
 * Events come from:
 * - Next.js API routes (seed, sync, classify) via thoughtEmitter
 * - Standalone WebSocket server (ws-server.js) via /api/events/forward bridge
 */
export async function GET(req) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(':heartbeat\n\n'));
        } catch (e) {
          cleanup();
        }
      }, 15000);

      // Event listener
      const listener = (event) => {
        try {
          const payload = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data:${payload}\n\n`));
        } catch (e) {
          cleanup();
        }
      };

      thoughtEmitter.subscribe(listener);

      const cleanup = () => {
        clearInterval(heartbeat);
        thoughtEmitter.unsubscribe(listener);
        try {
          controller.close();
        } catch (e) {}
      };

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        cleanup();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
