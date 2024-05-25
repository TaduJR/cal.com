// eslint-disable-next-line no-restricted-imports
import { differenceWith, isEqual } from "lodash";

import type { Booking } from "@calcom/prisma/client";

import type {
  BookingWithAttendees,
  IBookingCreateLog,
  IBookingDeleteLog,
  IBookingLog,
  IBookingUpdateLog,
} from "./types/BookingAuditLogTypes";
import { BookingAuditLogOption, CRUD } from "./types/BookingAuditLogTypes";
import deepDifference from "./util/deepDifference";

abstract class BookingAuditLogger {
  abstract readonly bookingAuditData: IBookingLog[];
  abstract readonly actionType: BookingAuditLogOption;

  constructor(
    protected actorUserId: number,
    protected targetEventId: number,
    protected targetTeamId: number
  ) {}

  async log() {
    // await prisma.auditLog.createMany({
    //   data: this.eventTypeAuditData,
    // });
  }
}

export class BookingCreateAuditLogger extends BookingAuditLogger {
  actionType: BookingAuditLogOption.BookingCreate;
  bookingAuditData: IBookingCreateLog[];

  constructor(actorUserId: number, targetEventId: number, targetUserId: number, targetTeamId: number) {
    super(actorUserId, targetEventId, targetTeamId);
    this.actionType = BookingAuditLogOption.BookingCreate;
    this.bookingAuditData = this.bookingCreateDataMaker(
      actorUserId,
      targetEventId,
      targetUserId,
      targetTeamId
    );
  }

  private bookingCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetUserId: number,
    targetTeamId: number
  ): IBookingCreateLog[] {
    return [
      {
        actionType: this.actionType,
        actorUserId,
        target: {
          targetEventId,
          ...(actorUserId !== targetUserId ? { targetUserId } : {}),
        },
        crud: CRUD.CREATE,
        targetTeamId,
      },
    ];
  }
}

export class BookingUpdateAuditLogger extends BookingAuditLogger {
  private readonly requiredEventTypeChanged = ["status", "location", "startTime", "endTime", "attendees"];
  actionType: BookingAuditLogOption.BookingUpdate;
  bookingAuditData: IBookingUpdateLog[];

  constructor(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    private readonly prevBookingWithAttendees: BookingWithAttendees,
    private readonly updatedBookingWithAttendees: BookingWithAttendees
  ) {
    super(actorUserId, targetEventId, targetTeamId);
    this.actionType = BookingAuditLogOption.BookingUpdate;
    this.bookingAuditData = this.bookingUpdateDataMaker(
      actorUserId,
      targetEventId,
      targetTeamId,
      this.prevBookingWithAttendees,
      this.updatedBookingWithAttendees
    );
  }

  private bookingUpdateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    prevBookingWithAttendees: BookingWithAttendees,
    updatedBookingWithAttendees: BookingWithAttendees
  ): IBookingUpdateLog[] {
    const eventTypeUpdateLog: IBookingUpdateLog[] = [];
    const changedAttribute = deepDifference(prevBookingWithAttendees, updatedBookingWithAttendees);

    const newAttendeesEmails: string[] = [];
    let removedAttendeesEmails: string[] = [];

    for (const key of changedAttribute) {
      if (this.requiredEventTypeChanged.includes(key) && key in updatedBookingWithAttendees) {
        if (key === "attendees") {
          removedAttendeesEmails = differenceWith(
            prevBookingWithAttendees.attendees,
            updatedBookingWithAttendees.attendees,
            isEqual
          ).map((attendee) => attendee.email);
          newAttendeesEmails.push(
            ...updatedBookingWithAttendees.attendees
              .slice(prevBookingWithAttendees.attendees.length)
              .map((attendee) => attendee.email)
          );
        }
        eventTypeUpdateLog.push({
          actionType: this.actionType,
          actorUserId,
          target: {
            targetEventId,
            changedAttribute: {
              ...(key === "attendees"
                ? { attendees: { created: { newAttendeesEmails }, deleted: { removedAttendeesEmails } } }
                : { [key]: updatedBookingWithAttendees[key] }),
            },
          },
          crud: CRUD.UPDATE,
          targetTeamId,
        });
      }
    }

    return eventTypeUpdateLog;
  }
}

export class BookingDeleteAuditLogger extends BookingAuditLogger {
  actionType: BookingAuditLogOption.BookingDelete;
  bookingAuditData: IBookingDeleteLog[];

  constructor(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    private readonly targetBooking: Booking
  ) {
    super(actorUserId, targetEventId, targetTeamId);
    this.actionType = BookingAuditLogOption.BookingDelete;
    this.bookingAuditData = this.bookingDeleteDataMaker(
      actorUserId,
      targetEventId,
      targetTeamId,
      this.targetBooking
    );
  }

  private bookingDeleteDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    targetBooking: Booking
  ): IBookingDeleteLog[] {
    return [
      {
        actionType: this.actionType,
        actorUserId,
        target: {
          targetEventId,
          targetBooking: {
            startTime: targetBooking.startTime,
            endTime: targetBooking.endTime,
          },
        },
        crud: CRUD.DELETE,
        targetTeamId,
      },
    ];
  }
}
