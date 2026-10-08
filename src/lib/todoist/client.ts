import "server-only";
import { getTodoistConfig } from "./store";

// Todoist unified API v1. The old REST v2 was sunset by Todoist and now
// returns HTTP 410 Gone — see issue #14. Auth is unchanged (Bearer token),
// but list endpoints are paginated and a few field names changed.
const TODOIST_BASE = "https://api.todoist.com/api/v1";

export type TodoistProject = {
  id: string;
  name: string;
  color: string;
  is_favorite: boolean;
  inbox_project?: boolean;
  parent_id: string | null;
};

// v1's `due` is an open object; it always carries `date`/`string`, and may
// carry `datetime` when the task has a time. All fields optional on purpose.
export type TodoistDue = {
  date?: string;
  datetime?: string;
  string?: string;
  timezone?: string | null;
  lang?: string;
  is_recurring?: boolean;
};

export type TodoistTask = {
  id: string;
  project_id: string;
  section_id?: string | null;
  content: string;
  description?: string;
  checked: boolean; // v1: was `is_completed` in REST v2
  priority: 1 | 2 | 3 | 4; // 1 = lowest, 4 = highest (P1)
  due?: TodoistDue | null;
  labels?: string[];
  child_order?: number;
  added_at?: string;
};

export type TodoistSection = {
  id: string;
  project_id: string;
  name: string;
  order?: number;
};

class TodoistError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "TodoistError";
  }
}

// v1 list responses: { results: [...], next_cursor: string | null }
type Paginated<T> = { results: T[]; next_cursor: string | null };

async function call<T>(
  path: string,
  init?: RequestInit & { token?: string },
): Promise<T> {
  const token = init?.token ?? (await getTodoistConfig()).apiToken;
  if (!token) {
    throw new TodoistError(400, "Todoist nicht konfiguriert.");
  }
  const res = await fetch(`${TODOIST_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });
  // 204 No Content für close/reopen/delete
  if (res.status === 204) return undefined as T;
  const data: any = await res.json().catch(() => null);
  if (!res.ok) {
    const msg =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Todoist API ${res.status}`;
    throw new TodoistError(res.status, msg);
  }
  return data as T;
}

/**
 * v1 list endpoints are paginated ({ results, next_cursor }). Follow the
 * cursor until it's null and return the flat list. limit=200 is the max,
 * which keeps round-trips low for typical accounts.
 */
async function collectPaginated<T>(path: string, token?: string): Promise<T[]> {
  const out: T[] = [];
  let cursor: string | null = null;
  do {
    const sep = path.includes("?") ? "&" : "?";
    const url: string =
      `${path}${sep}limit=200` +
      (cursor ? `&cursor=${encodeURIComponent(cursor)}` : "");
    const page: Paginated<T> = await call<Paginated<T>>(url, {
      token,
      method: "GET",
    });
    if (Array.isArray(page.results)) out.push(...page.results);
    cursor = page.next_cursor ?? null;
  } while (cursor);
  return out;
}

/**
 * Verifiziert den Token (lädt eine Seite Projekte — leichtester Endpoint).
 * Gibt den echten Status/Fehlertext zurück, damit die UI nicht pauschal
 * "401, Token neu erzeugen" behauptet (siehe issue #14).
 */
export async function verifyToken(
  token: string,
): Promise<{ ok: boolean; status?: number; message?: string }> {
  try {
    await call<Paginated<TodoistProject>>("/projects?limit=1", {
      token,
      method: "GET",
    });
    return { ok: true };
  } catch (e) {
    if (e instanceof TodoistError)
      return { ok: false, status: e.status, message: e.message };
    return { ok: false };
  }
}

export async function listProjects(): Promise<TodoistProject[]> {
  return collectPaginated<TodoistProject>("/projects");
}

export async function listTasks(projectId: string): Promise<TodoistTask[]> {
  return collectPaginated<TodoistTask>(
    `/tasks?project_id=${encodeURIComponent(projectId)}`,
  );
}

/**
 * Sections of a project, in Todoist's own display order. Used to group tasks
 * in widgets that opt into it (see TodosWidget) — purely additive, does not
 * change which tasks are fetched.
 */
export async function listSections(projectId: string): Promise<TodoistSection[]> {
  return collectPaginated<TodoistSection>(
    `/sections?project_id=${encodeURIComponent(projectId)}`,
  );
}

export async function createTask(params: {
  projectId: string;
  content: string;
  description?: string;
  dueString?: string;
  priority?: 1 | 2 | 3 | 4;
}): Promise<TodoistTask> {
  return call<TodoistTask>(`/tasks`, {
    method: "POST",
    body: JSON.stringify({
      content: params.content,
      project_id: params.projectId,
      description: params.description,
      due_string: params.dueString,
      priority: params.priority,
    }),
  });
}

export async function updateTask(
  id: string,
  patch: Partial<{ content: string; description: string; dueString: string | null; priority: 1 | 2 | 3 | 4 }>,
): Promise<TodoistTask> {
  const body: Record<string, any> = {};
  if (patch.content !== undefined) body.content = patch.content;
  if (patch.description !== undefined) body.description = patch.description;
  if (patch.dueString !== undefined) body.due_string = patch.dueString ?? "";
  if (patch.priority !== undefined) body.priority = patch.priority;
  return call<TodoistTask>(`/tasks/${encodeURIComponent(id)}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function closeTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}/close`, { method: "POST" });
}

export async function reopenTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}/reopen`, { method: "POST" });
}

export async function deleteTask(id: string): Promise<void> {
  await call<void>(`/tasks/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export { TodoistError };
