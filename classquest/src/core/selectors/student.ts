import type { AppState, LogEntry, Student } from '~/types/models';

export function selectStudentById(state: Pick<AppState, 'students'>, id: string | null | undefined): Student | null {
  if (!id) {
    return null;
  }
  return state.students.find((student) => student.id === id) ?? null;
}

export function selectLogsForStudent(
  state: Pick<AppState, 'logs'>,
  studentId: string | null | undefined,
  limit = 25,
): LogEntry[] {
  if (!studentId) {
    return [];
  }
  const safeLimit = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 25;
  if (safeLimit === 0) {
    return [];
  }
  const result: LogEntry[] = [];
  for (const entry of state.logs) {
    if (entry.studentId !== studentId) {
      continue;
    }
    result.push(entry);
    if (result.length >= safeLimit) {
      break;
    }
  }
  return result;
}
