import { Prisma } from "@prisma/client";

import {
  EventTypeCreateAuditLogger,
  EventTypeUpdateAuditLogger,
} from "@calcom/features/audit-log/eventTypeAuditLogger";
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";

export function auditLogCustomMethodClientExtension() {
  return Prisma.defineExtension({
    query: {
      eventType: {
        async create({ args: { actorUserId, ...args }, query }) {
          const createdEventType = await query(args);
          if (actorUserId) {
            const evenTypeCreateAuditLogger = new EventTypeCreateAuditLogger(
              actorUserId,
              createdEventType as EventType
            );
            await evenTypeCreateAuditLogger.log();
          }
          return createdEventType;
        },
        async update({ args: { actorUserId, ...args }, query }) {
          const prevEventType = await prisma.eventType.findUnique({ where: args.where });
          const updatedEventType = await query(args);
          if (actorUserId) {
            const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
              actorUserId,
              prevEventType as EventType,
              updatedEventType as EventType
            );
            await evenTypeUpdateAuditLogger.log();
          }
          return updatedEventType;
        },
        async updateMany({ args: { actorUserId, ...args }, query }) {
          const prevEventTypes = await prisma.eventType.findMany({ where: args.where });
          const updatedEventTypes = await query(args);
          const listOfUpdatedEventTypes = await prisma.eventType.findMany({ where: args.where });
          if (actorUserId) {
            for (let i = 0; i < prevEventTypes.length; i++) {
              const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
                actorUserId,
                prevEventTypes[i],
                listOfUpdatedEventTypes[i]
              );
              await evenTypeUpdateAuditLogger.log();
            }
          }
          return updatedEventTypes;
        },
      },
    },
  });
}

export function withQueryContext<T>(args: T, { actorUserId }: { actorUserId: number | undefined }) {
  (args as any).actorUserId = actorUserId;
  return args;
}
