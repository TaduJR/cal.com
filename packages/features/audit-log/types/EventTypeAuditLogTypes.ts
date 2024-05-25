export const CRUD = {
  CREATE: "CREATE",
  READ: "READ",
  UPDATE: "UPDATE",
  DELETE: "DELETE",
} as const;

export enum EventTypeAuditLogOption {
  EventTypeCreate = "eventType.create",
  EventTypeUpdate = "eventType.update",
  EventTypeDelete = "eventType.delete",
}

export interface IEventTypeCreateLog {
  actionType: EventTypeAuditLogOption.EventTypeCreate;
  actorUserId: number;
  target: {
    targetEventId: number;
  };
  crud: CRUD.CREATE;
  targetTeamId: number;
}

export interface IEventTypeUpdateLog {
  actionType: EventTypeAuditLogOption.EventTypeUpdate;
  actorUserId: number;
  target: {
    targetEventId: number;
    changedAttribute: {
      [propName: string]: unknown;
    };
  };
  crud: CRUD.UPDATE;
  targetTeamId: number;
}

export interface IEventTypeDeleteLog {
  actionType: EventTypeAuditLogOption.EventTypeDelete;
  actorUserId: number;
  target: {
    targetEventId: number;
  };
  crud: CRUD.DELETE;
  targetTeamId: number;
}
export type IEventTypeLog = IEventTypeCreateLog | IEventTypeUpdateLog | IEventTypeDeleteLog;
