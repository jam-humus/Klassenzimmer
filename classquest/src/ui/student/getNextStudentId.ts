import type { Student } from '~/types/models';

export type StudentNavigationDirection = 'forward' | 'backward';

export function getNextStudentId(
  currentId: string | null | undefined,
  direction: StudentNavigationDirection,
  students: Array<Pick<Student, 'id'>>,
): string | null {
  if (!Array.isArray(students) || students.length === 0) {
    return null;
  }

  const safeCurrentId = typeof currentId === 'string' ? currentId : null;
  const currentIndex = safeCurrentId
    ? students.findIndex((student) => student.id === safeCurrentId)
    : -1;

  if (currentIndex === -1) {
    return direction === 'backward' ? students[students.length - 1]?.id ?? null : students[0]?.id ?? null;
  }

  if (direction === 'forward') {
    const nextIndex = (currentIndex + 1) % students.length;
    return students[nextIndex]?.id ?? null;
  }

  const previousIndex = (currentIndex - 1 + students.length) % students.length;
  return students[previousIndex]?.id ?? null;
}

export default getNextStudentId;
