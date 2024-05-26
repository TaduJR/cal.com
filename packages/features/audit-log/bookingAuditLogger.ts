// eslint-disable-next-line no-restricted-imports
import { differenceWith, isEqual } from "lodash";

import { prisma } from "@calcom/prisma";
import { BookingStatus, type Attendee } from "@calcom/prisma/client";

import type {
  BookingWithAttendees,
  IBookingCreateLog,
  IBookingDeleteLog,
  IBookingLog,
  IBookingUpdateLog,
} from "./types/BookingAuditLogTypes";
import { BookingAuditLogOption } from "./types/BookingAuditLogTypes";
import { CRUD } from "./types/CRUD";
import deepDifference from "./util/deepDifference";

abstract class BookingAuditLogger {
  abstract readonly bookingAuditData: IBookingLog[];
  abstract readonly actionType: BookingAuditLogOption;

  protected actorUserId = 0;
  protected targetEventId = 0;
  protected targetTeamId = 0;
  protected targetBookingId = 0;
  protected targetBookingWithAttendees: BookingWithAttendees = {} as BookingWithAttendees;

  constructor(actorUserId: number, targetBookingWithAttendees: BookingWithAttendees, targetTeamId: number) {
    if (!targetBookingWithAttendees.eventTypeId || !targetTeamId) return this;
    this.actorUserId = actorUserId;
    this.targetEventId = targetBookingWithAttendees.eventTypeId;
    this.targetTeamId = targetTeamId;
    this.targetBookingWithAttendees = targetBookingWithAttendees;
  }

  async log() {
    if (!this.bookingAuditData?.length) return;
    await prisma.auditLog.createMany({
      data: this.bookingAuditData,
    });
  }
}

export class BookingCreateAuditLogger extends BookingAuditLogger {
  actionType: typeof BookingAuditLogOption.BookingCreate = BookingAuditLogOption.BookingCreate;
  bookingAuditData: IBookingCreateLog[] = [];

  constructor(actorUserId: number, targetBookingWithAttendees: BookingWithAttendees, targetTeamId: number) {
    super(actorUserId, targetBookingWithAttendees, targetTeamId);
    if (targetBookingWithAttendees.status !== BookingStatus.ACCEPTED) return this;
    this.bookingAuditData = this.bookingCreateDataMaker(
      actorUserId,
      this.targetEventId,
      targetBookingWithAttendees.attendees,
      targetTeamId
    );
  }

  private bookingCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetAttendees: Attendee[],
    targetTeamId: number
  ): IBookingCreateLog[] {
    const bookedAttendeesIds = targetAttendees.map((attendee) => attendee.id);
    const data: IBookingCreateLog[] = [];
    for (const attendeeId of bookedAttendeesIds) {
      data.push({
        actionType: this.actionType,
        actorUserId,
        target: {
          targetEvent: targetEventId,
          targetUser: attendeeId,
        },
        crud: CRUD.CREATE,
        targetTeamId,
      });
    }
    return data;
  }
}

export class BookingUpdateAuditLogger extends BookingAuditLogger {
  private readonly requiredEventTypeChanged = ["status", "location", "startTime", "endTime", "attendees"];
  actionType: typeof BookingAuditLogOption.BookingUpdate;
  bookingAuditData: IBookingUpdateLog[];

  constructor(
    actorUserId: number,
    private readonly prevBookingWithAttendees: BookingWithAttendees,
    private readonly updatedBookingWithAttendees: BookingWithAttendees,
    targetTeamId: number
  ) {
    super(actorUserId, updatedBookingWithAttendees, targetTeamId);
    this.actionType = BookingAuditLogOption.BookingUpdate;
    this.bookingAuditData = this.bookingUpdateDataMaker(
      actorUserId,
      targetTeamId,
      this.prevBookingWithAttendees,
      this.updatedBookingWithAttendees
    );
  }

  private bookingUpdateDataMaker(
    actorUserId: number,
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
            targetEvent: this.targetEventId,
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
  actionType: typeof BookingAuditLogOption.BookingDelete;
  bookingAuditData: IBookingDeleteLog[];

  constructor(actorUserId: number, targetBookingWithAttendees: BookingWithAttendees, targetTeamId: number) {
    super(actorUserId, targetBookingWithAttendees, targetTeamId);
    this.actionType = BookingAuditLogOption.BookingDelete;
    this.bookingAuditData = this.bookingDeleteDataMaker(
      actorUserId,
      this.targetBookingWithAttendees,
      targetTeamId
    );
  }

  private bookingDeleteDataMaker(
    actorUserId: number,
    targetBooking: BookingWithAttendees,
    targetTeamId: number
  ): IBookingDeleteLog[] {
    const data: IBookingDeleteLog[] = [];
    for (const attendee of targetBooking.attendees) {
      data.push({
        actionType: this.actionType,
        actorUserId,
        target: {
          targetBooking: {
            startTime: targetBooking.startTime,
            endTime: targetBooking.endTime,
          },
          targetEvent: targetBooking.eventTypeId!,
          targetUser: attendee.id,
        },
        crud: CRUD.DELETE,
        targetTeamId,
      });
    }

    return data;
  }
}
