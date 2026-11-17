import {
  getTimerStateSnapshot,
  subscribeTimerUpdates,
} from "@/lib/timer/serverStore.server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;

      const sendEvent = (eventName, data) => {
        if (closed) return;
        try {
          const line = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(line));
        } catch {
          // Stream already closed
        }
      };

      const sendHeartbeat = () => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`: ping ${Date.now()}\n\n`));
        } catch {
          // Stream already closed
        }
      };

      const unsubscribe = subscribeTimerUpdates((payload) => {
        sendEvent("state", payload);
      });

      const heartbeatId = setInterval(sendHeartbeat, 15_000);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeatId);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // Already closed
        }
      };

      request.signal?.addEventListener("abort", cleanup, { once: true });

      try {
        const initial = await getTimerStateSnapshot();
        sendEvent("state", initial);
      } catch {
        sendEvent("error", { message: "Could not load initial timer state" });
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
