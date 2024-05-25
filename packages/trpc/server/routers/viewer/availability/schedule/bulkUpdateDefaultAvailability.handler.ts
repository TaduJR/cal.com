import { prisma } from "@calcom/prisma";
import { withQueryContext } from "@calcom/prisma/extensions/audit-log-creator";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TBulkUpdateToDefaultAvailabilityInputSchema } from "./bulkUpdateDefaultAvailability.schema";

type BulkUpdateToDefaultAvailabilityOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TBulkUpdateToDefaultAvailabilityInputSchema;
};

export const bulkUpdateToDefaultAvailabilityHandler = async ({
  ctx,
  input,
}: BulkUpdateToDefaultAvailabilityOptions) => {
  const { eventTypeIds } = input;
  const defaultScheduleId = ctx.user.defaultScheduleId;

  if (!defaultScheduleId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default schedule not set",
    });
  }

  return await prisma.eventType.updateMany(
    withQueryContext(
      {
        where: {
          id: {
            in: eventTypeIds,
          },
          userId: ctx.user.id,
        },
        data: {
          scheduleId: defaultScheduleId,
        },
      },
      { actorUserId: ctx.user.id }
    )
  );
};
