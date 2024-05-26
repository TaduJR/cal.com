import type { CRUD } from "./CRUD";

export const EventTypeAuditLogOption = {
  EventTypeCreate: "EventTypeCreate",
  EventTypeUpdate: "EventTypeUpdate",
  EventTypeDelete: "EventTypeDelete",
} as const;

export type EventTypeAuditLogOption = (typeof EventTypeAuditLogOption)[keyof typeof EventTypeAuditLogOption];

export interface IEventTypeCreateLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeCreate;
  actorUserId: number;
  target: {
    targetEvent: number | string;
  };
  crud: typeof CRUD.CREATE;
  targetTeamId: number;
}

export interface IEventTypeUpdateLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeUpdate;
  actorUserId: number;
  target: {
    targetEvent: number | string;
    changedAttribute: {
      [propName: string]: unknown;
    };
  };
  crud: typeof CRUD.UPDATE;
  targetTeamId: number;
}

export interface IEventTypeDeleteLog {
  actionType: typeof EventTypeAuditLogOption.EventTypeDelete;
  actorUserId: number;
  target: {
    targetEvent: string;
  };
  crud: typeof CRUD.DELETE;
  targetTeamId: number;
}
export type IEventTypeLog = IEventTypeCreateLog | IEventTypeUpdateLog | IEventTypeDeleteLog;
