/** Which moves between these are legal is the API's to enforce — see docs/product. */
export type TaskStatus = "todo" | "doing" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  /** ISO-8601. JSON has no date type, so the wire carries strings, never `Date`. */
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskPayload {
  title: string;
}

export interface UpdateTaskStatusPayload {
  status: TaskStatus;
}

export interface TaskListResponse {
  items: Task[];
}

/** Every error the API answers. `errorCode` is stable to switch on; `message` is for logs. */
export interface ApiErrorBody {
  statusCode: number;
  errorCode: string;
  message: string;
}
