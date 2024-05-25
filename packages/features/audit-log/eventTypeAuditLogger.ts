// eslint-disable-next-line no-restricted-imports
import { prisma } from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";

import type {
  IEventTypeCreateLog,
  IEventTypeUpdateLog,
  IEventTypeDeleteLog,
  IEventTypeLog,
} from "./types/EventTypeAuditLogTypes";
import { EventTypeAuditLogOption, CRUD } from "./types/EventTypeAuditLogTypes";
import deepDifference from "./util/deepDifference";

abstract class EventTypeAuditLogger {
  abstract readonly eventTypeAuditData: IEventTypeLog[];
  abstract readonly actionType: EventTypeAuditLogOption;

  protected readonly actorUserId: number = 0;
  protected readonly targetEventId: number = 0;
  protected readonly targetTeamId: number = 0;
  protected readonly targetEventType: EventType = {} as EventType;

  constructor(actorUserId: number, targetEventType: EventType) {
    if (targetEventType.id && targetEventType.teamId) {
      this.actorUserId = actorUserId;
      this.targetEventId = targetEventType.id;
      this.targetTeamId = targetEventType.teamId;
      this.targetEventType = targetEventType;
    } else return this;
  }

  async log() {
    if (!this.eventTypeAuditData?.length) return;
    await prisma.auditLog.createMany({
      data: this.eventTypeAuditData,
    });
  }
}

export class EventTypeCreateAuditLogger extends EventTypeAuditLogger {
  actionType: EventTypeAuditLogOption.EventTypeCreate;
  eventTypeAuditData: IEventTypeCreateLog[];

  constructor(actorUserId: number, targetEventType: EventType) {
    super(actorUserId, targetEventType);
    this.actionType = EventTypeAuditLogOption.EventTypeCreate;
    this.eventTypeAuditData = this.eventTypeCreateDataMaker(
      this.actorUserId,
      this.targetEventId,
      this.targetTeamId
    );
  }

  private eventTypeCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number
  ): IEventTypeCreateLog[] {
    return [
      {
        actionType: this.actionType,
        actorUserId,
        target: {
          targetEventId,
        },
        crud: CRUD.CREATE,
        targetTeamId,
      },
    ];
  }
}

export class EventTypeUpdateAuditLogger extends EventTypeAuditLogger {
  actionType: EventTypeAuditLogOption.EventTypeUpdate;
  eventTypeAuditData: IEventTypeUpdateLog[];
  private readonly requiredEventTypeChanged = ["title", "duration", "locations"];
  private readonly prevEventType: EventType;

  constructor(actorUserId: number, prevEventType: EventType, targetEventType: EventType) {
    super(actorUserId, targetEventType);
    this.prevEventType = prevEventType;

    this.actionType = EventTypeAuditLogOption.EventTypeUpdate;
    this.eventTypeAuditData = this.eventTypeUpdateDataMaker(
      this.actorUserId,
      this.targetEventId,
      this.targetTeamId,
      this.prevEventType,
      this.targetEventType
    );
  }

  private eventTypeUpdateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number,
    prevEventType: EventType,
    targetEventType: EventType
  ): IEventTypeUpdateLog[] {
    const eventTypeUpdateLog: IEventTypeUpdateLog[] = [];

    const changedAttribute = deepDifference(prevEventType, targetEventType);
    for (const key of changedAttribute) {
      if (this.requiredEventTypeChanged.includes(key) && key in targetEventType) {
        eventTypeUpdateLog.push({
          actionType: this.actionType,
          actorUserId,
          target: {
            targetEventId,
            changedAttribute: {
              [key]: targetEventType[key],
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

export class EventTypeDeleteAuditLogger extends EventTypeAuditLogger {
  actionType: EventTypeAuditLogOption.EventTypeDelete;
  eventTypeAuditData: IEventTypeDeleteLog[];

  constructor(actorUserId: number, targetEventType: EventType) {
    super(actorUserId, targetEventType);
    this.actionType = EventTypeAuditLogOption.EventTypeDelete;
    this.eventTypeAuditData = this.eventTypeCreateDataMaker(
      this.actorUserId,
      this.targetEventId,
      this.targetTeamId
    );
  }

  private eventTypeCreateDataMaker(
    actorUserId: number,
    targetEventId: number,
    targetTeamId: number
  ): IEventTypeDeleteLog[] {
    return [
      {
        actionType: this.actionType,
        actorUserId,
        target: {
          targetEventId,
        },
        crud: CRUD.DELETE,
        targetTeamId,
      },
    ];
  }
}
