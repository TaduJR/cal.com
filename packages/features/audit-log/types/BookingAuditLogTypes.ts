import type { Prisma } from "@calcom/prisma/client";
import type { CRUD } from "@calcom/prisma/client";

export const BookingAuditLogOption = {
  BookingCreate: "BookingCreate",
  BookingUpdate: "BookingUpdate",
  BookingDelete: "BookingDelete",
} as const;

export type BookingAuditLogOption = (typeof BookingAuditLogOption)[keyof typeof BookingAuditLogOption];
export interface IBookingCreateLog {
  actionType: typeof BookingAuditLogOption.BookingCreate;
  actorUserId: number;
  target: {
    targetEvent: number | string;
    targetUser: number | string;
  };
  crud: typeof CRUD.CREATE;
  targetTeamId: number;
}

export interface IBookingUpdateLog {
  actionType: typeof BookingAuditLogOption.BookingUpdate;
  actorUserId: number;
  target: {
    targetEvent: number | string;
    targetUser?: number | string;
    changedAttribute?: {
      [propName: string]: unknown;
    };
  };
  crud: typeof CRUD.UPDATE;
  targetTeamId: number;
}

export interface IBookingDeleteLog {
  actionType: typeof BookingAuditLogOption.BookingDelete;
  actorUserId: number;
  target: {
    targetEvent: number | string;
    targetBooking: {
      startTime: Date;
      endTime: Date;
    };
    targetUser: number | string;
  };
  crud: typeof CRUD.DELETE;
  targetTeamId: number;
}

export type IBookingLog = IBookingCreateLog | IBookingUpdateLog | IBookingDeleteLog;

export type BookingWithAttendees = Prisma.BookingGetPayload<{
  include: { attendees: true };
}>;
