import { describe, expect, it, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import StudentProfileCardV2 from '~/ui/components/student/StudentProfileCardV2';
import { AvatarZoomModal } from '~/ui/components/ui/AvatarZoomModal';
import { TrophyGrid } from '~/ui/components/badges/TrophyGrid';
import { getNextStudentId } from '~/ui/student/getNextStudentId';
import type { Badge, Student } from '~/types/models';

vi.mock('~/ui/components/AwardBadgeButton', () => ({
  __esModule: true,
  default: () => <button type="button">Badge vergeben</button>,
}));

vi.mock('~/ui/avatar/AvatarView', () => ({
  __esModule: true,
  AvatarView: ({ student, size }: { student: { alias: string }; size: number }) => (
    <div role="img">Avatar {student.alias} ({size})</div>
  ),
  default: ({ student, size }: { student: { alias: string }; size: number }) => (
    <div role="img">Avatar {student.alias} ({size})</div>
  ),
}));

describe('getNextStudentId', () => {
  const students = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('returns null when no students are present', () => {
    expect(getNextStudentId(null, 'forward', [])).toBeNull();
  });

  it('returns first student when current is null (forward)', () => {
    expect(getNextStudentId(null, 'forward', students)).toBe('a');
  });

  it('wraps around when moving forward from last student', () => {
    expect(getNextStudentId('c', 'forward', students)).toBe('a');
  });

  it('wraps around when moving backward from first student', () => {
    expect(getNextStudentId('a', 'backward', students)).toBe('c');
  });
});

describe('component smoke tests', () => {
  const baseStudent: Student = {
    id: 'student-1',
    alias: 'Alex',
    xp: 120,
    level: 3,
    streaks: {},
    lastAwardedDay: {},
    badges: [],
    avatarMode: 'procedural',
    avatarPack: { stageKeys: [] },
  };

  it('renders StudentProfileCardV2 without crashing', () => {
    const html = renderToString(
      <StudentProfileCardV2
        student={baseStudent}
        xpPerLevel={100}
        teamName="Team A"
        categories={[{ name: 'Mathe', xp: 60 }]}
        categoriesTotal={60}
      />,
    );
    expect(html).toContain('Alex');
    expect(html).toContain('Trophäenschrank');
  });

  it('renders AvatarZoomModal in open state', () => {
    const html = renderToString(
      <AvatarZoomModal
        open
        onClose={() => undefined}
        student={{ alias: 'Alex', avatarMode: 'procedural', avatarPack: { stageKeys: [] }, level: 1, xp: 0 }}
      />,
    );
    expect(html).toContain('Avatar von Alex');
  });

  it('renders TrophyGrid with badges', () => {
    const badges: Badge[] = [
      { id: 'badge-1', name: 'Rakete', description: 'Abgehoben', awardedAt: '2024-01-01T10:00:00Z' },
    ];
    const html = renderToString(<TrophyGrid badges={badges} />);
    expect(html).toContain('Rakete');
  });
});
