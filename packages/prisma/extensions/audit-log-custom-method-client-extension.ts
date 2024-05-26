import { Prisma } from "@prisma/client";
import type { BookingWithAttendees } from "audit-log/types/BookingAuditLogTypes";

import {
  BookingCreateAuditLogger,
  BookingUpdateAuditLogger,
  BookingDeleteAuditLogger,
} from "@calcom/features/audit-log/bookingAuditLogger";
import {
  EventTypeCreateAuditLogger,
  EventTypeUpdateAuditLogger,
  EventTypeDeleteAuditLogger,
} from "@calcom/features/audit-log/eventTypeAuditLogger";
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";

export function auditLogCustomMethodClientExtension() {
  return Prisma.defineExtension({
    query: {
      user: {
        async delete({ args, query }) {
          const deletedUser = await query(args); //
          await prisma.auditLog.updateMany({
            where: {
              actorUserId: args.where.id,
            },
            data: {
              actorUserId: null,
              legacyActorUserFullName: deletedUser.name,
            },
          });
          await prisma.auditLog.updateMany({
            where: {
              target: { equals: { targetUser: args.where.id } },
            },
            data: {
              target: { targetUser: deletedUser.name },
            },
          });
          return deletedUser; //
        },
      },
      eventType: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const createdEventType = await query(args); //
          if (typeof actorUserId === "number") {
            const evenTypeCreateAuditLogger = new EventTypeCreateAuditLogger(
              actorUserId,
              createdEventType as EventType
            );
            await evenTypeCreateAuditLogger.log();
          }
          return createdEventType; //
        },
        async update({ args, query }) {
          const actorUserId = args.data.actorUserId;
          args.data.actorUserId = null;
          const fetchedPrevEventType = await prisma.eventType.findUnique({ where: args.where });
          const updatedEventType = await query(args); //
          const fetchedUpdatedEventType = await prisma.eventType.findUnique({ where: args.where });
          console.log(fetchedPrevEventType, fetchedUpdatedEventType);
          if (typeof actorUserId === "number") {
            const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
              actorUserId,
              fetchedPrevEventType as EventType,
              fetchedUpdatedEventType as EventType
            );
            await evenTypeUpdateAuditLogger.log();
          }
          return updatedEventType; //
        },
        async updateMany({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const prevEventTypes = await prisma.eventType.findMany({
            where: args.where,
            orderBy: { id: "asc" },
          });
          const updatedEventTypes = await query(args); //
          const listOfUpdatedEventTypes = await prisma.eventType.findMany({
            where: args.where,
            orderBy: { id: "asc" },
          });
          if (typeof actorUserId === "number") {
            for (let i = 0; i < prevEventTypes.length; i++) {
              const evenTypeUpdateAuditLogger = new EventTypeUpdateAuditLogger(
                actorUserId,
                prevEventTypes[i],
                listOfUpdatedEventTypes[i]
              );
              await evenTypeUpdateAuditLogger.log();
            }
          }
          return updatedEventTypes; //
        },
        async delete({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const deletedEventType = await query(args); //
          if (typeof actorUserId === "number") {
            const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(
              actorUserId,
              deletedEventType as EventType
            );
            await evenTypeDeleteAuditLogger.log();
          }
          await prisma.auditLog.updateMany({
            where: { target: { equals: { targetEvent: deletedEventType.id } } },
            data: { target: { targetEvent: deletedEventType.title } },
          });
          return deletedEventType; //
        },
        async deleteMany({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const toBeDeletedEventTypes = await prisma.eventType.findMany({
            where: args.where,
            orderBy: { id: "asc" },
          });
          const deletedEventTypesResponse = await query(args); //
          if (typeof actorUserId === "number") {
            for (let i = 0; i < toBeDeletedEventTypes.length; i++) {
              const evenTypeDeleteAuditLogger = new EventTypeDeleteAuditLogger(
                actorUserId,
                toBeDeletedEventTypes[i]
              );
              await evenTypeDeleteAuditLogger.log();
            }
          }
          await prisma.auditLog.updateMany({
            where: { target: { equals: { targetEvent: { in: toBeDeletedEventTypes.map((e) => e.id) } } } },
            data: { target: { targetEvent: { in: toBeDeletedEventTypes.map((e) => e.title) } } },
          });
          return deletedEventTypesResponse; //
        },
      },
      booking: {
        async create({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const createdBooking = await query(args); //
          if (createdBooking?.eventTypeId) {
            const eventType = await prisma.eventType.findUnique({
              where: { id: createdBooking?.eventTypeId },
            });
            if (typeof actorUserId === "number" && eventType?.teamId) {
              const BookingWithAttendees = await prisma.booking.findUnique({
                where: { id: createdBooking.id },
                include: { attendees: true },
              });
              const bookingCreateAuditLogger = new BookingCreateAuditLogger(
                actorUserId,
                BookingWithAttendees as BookingWithAttendees,
                eventType.teamId
              );
              await bookingCreateAuditLogger.log();
            }
          }
          return createdBooking; //
        },
        async update({ args, query }) {
          const actorUserId = args.data.actorUserId;
          args.data.actorUserId = null;
          const fetchedPrevBookingWithAttendees = await prisma.booking.findUnique({
            where: args.where,
            include: { attendees: true },
          });
          const updatedBooking = await query(args); //
          const fetchedUpdatedBookingWithAttendees = await prisma.booking.findUnique({
            where: args.where,
            include: { attendees: true },
          });

          if (fetchedUpdatedBookingWithAttendees?.eventTypeId && typeof actorUserId === "number") {
            const eventType = await prisma.eventType.findUnique({
              where: { id: fetchedUpdatedBookingWithAttendees?.eventTypeId },
            });
            if (eventType?.teamId) {
              const bookingUpdateAuditLogger = new BookingUpdateAuditLogger(
                actorUserId,
                fetchedPrevBookingWithAttendees as BookingWithAttendees,
                fetchedUpdatedBookingWithAttendees as BookingWithAttendees,
                eventType?.teamId
              );
              await bookingUpdateAuditLogger.log();
            }
          }

          return updatedBooking; //
        },
        async updateMany({ args, query }) {
          const actorUserId = args.data?.actorUserId;
          args.data.actorUserId = null;
          const prevBookingsWithAttendees = await prisma.booking.findMany({
            where: args.where,
            orderBy: { id: "asc" },
            include: { attendees: true },
          });
          const updatedBookings = await query(args); //
          const updatedBookingsWithAttendees = await prisma.booking.findMany({
            where: args.where,
            orderBy: { id: "asc" },
            include: { attendees: true },
          });
          if (typeof actorUserId === "number") {
            for (let i = 0; i < prevBookingsWithAttendees.length; i++) {
              const eventTypeId = updatedBookingsWithAttendees[i]?.eventTypeId;
              if (eventTypeId) {
                const eventType = await prisma.eventType.findUnique({
                  where: { id: eventTypeId },
                });
                if (eventType?.teamId) {
                  const bookingUpdateAuditLogger = new BookingUpdateAuditLogger(
                    actorUserId,
                    prevBookingsWithAttendees[i] as BookingWithAttendees,
                    updatedBookingsWithAttendees[i] as BookingWithAttendees,
                    eventType?.teamId
                  );
                  await bookingUpdateAuditLogger.log();
                }
              }
            }
          }
          return updatedBookings;
        },
        async delete({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const deletedBooking = await query(args); //
          if (deletedBooking?.eventTypeId && typeof actorUserId === "number") {
            const eventType = await prisma.eventType.findUnique({
              where: { id: deletedBooking?.eventTypeId },
            });
            if (eventType?.teamId) {
              const BookingWithAttendees = await prisma.booking.findUnique({
                where: { id: deletedBooking.id },
                include: { attendees: true },
              });
              const bookingDeleteAuditLogger = new BookingDeleteAuditLogger(
                actorUserId,
                BookingWithAttendees as BookingWithAttendees,
                eventType.teamId
              );
              await bookingDeleteAuditLogger.log();
            }
          }
          return deletedBooking; //
        },
        async deleteMany({ args, query }) {
          const actorUserId = args.where?.actorUserId;
          delete args.where?.actorUserId;
          const toBeDeletedBookings = await prisma.booking.findMany({
            where: args.where,
            orderBy: { id: "asc" },
            include: { attendees: true },
          });
          const deletedBookingsResponse = await query(args); //
          if (typeof actorUserId === "number") {
            for (let i = 0; i < toBeDeletedBookings.length; i++) {
              const eventTypeId = toBeDeletedBookings[i]?.eventTypeId;
              if (eventTypeId) {
                const eventType = await prisma.eventType.findUnique({
                  where: { id: eventTypeId },
                });
                if (eventType?.teamId) {
                  const bookingDeleteAuditLogger = new BookingDeleteAuditLogger(
                    actorUserId,
                    toBeDeletedBookings[i] as BookingWithAttendees,
                    eventType.teamId
                  );
                  await bookingDeleteAuditLogger.log();
                }
              }
            }
          }
          return deletedBookingsResponse; //
        },
      },
    },
  });
}
