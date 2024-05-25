import type { Prisma } from "@calcom/prisma/client";

export const CRUD = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
} as const;
export type CRUD = (typeof CRUD)[keyof typeof CRUD];

export enum BookingAuditLogOption {
  BookingCreate = "booking.create",
  BookingUpdate = "booking.update",
  BookingDelete = "booking.delete",
}

export interface IBookingCreateLog {
  actionType: BookingAuditLogOption.BookingCreate;
  actorUserId: number;
  target: {
    targetEventId: number;
    targetUserId?: number;
  };
  crud: CRUD.CREATE;
  targetTeamId: number;
}

export interface IBookingUpdateLog {
  actionType: BookingAuditLogOption.BookingUpdate;
  actorUserId: number;
  target: {
    targetEventId: number;
    targetUserId?: number;
    changedAttribute?: {
      [propName: string]: unknown;
    };
  };
  crud: CRUD.UPDATE;
  targetTeamId: number;
}

export interface IBookingDeleteLog {
  actionType: BookingAuditLogOption.BookingDelete;
  actorUserId: number;
  target: {
    targetEventId: number;
    targetBooking: {
      startTime: Date;
      endTime: Date;
    };
  };
  crud: CRUD.DELETE;
  targetTeamId: number;
}

export type IBookingLog = IBookingCreateLog | IBookingUpdateLog | IBookingDeleteLog;

export type BookingWithAttendees = Prisma.BookingGetPayload<{
  include: { attendees: true };
}>;
