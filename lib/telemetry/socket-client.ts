"use client";
import * as Sentry from "@sentry/core";
import type { Socket } from "socket.io-client";
import { socketTrace } from "./socket";
import { safeOperation } from "./privacy";
/** Socket.io's application events have no automatic browser/HTTP trace relationship. */
export function emitWithTrace(
  socket: Socket,
  event: string,
  payload: object,
  target: string,
  ack: (result: any) => void,
) {
  Sentry.startSpanManual(
    {
      name: safeOperation(`socket.${event}`),
      op: safeOperation(`socket.${event}`),
    },
    (_span, finish) => {
      const timer = setTimeout(finish, 120_000);
      socket.emit(event, payload, socketTrace(target), (result: unknown) => {
        clearTimeout(timer);
        finish();
        ack(result);
      });
    },
  );
}
