import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  addQuest,
  addStudent,
  addTeam,
  assignStudentToTeam,
  awardQuest,
  createInitialState,
  setQuestActive,
} from '~/core/state';

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('state helpers', () => {
  it('creates an initial state with default settings', () => {
    const state = createInitialState({ xpPerLevel: 250 }, 3);
    expect(state.settings.className).toBe('Meine Klasse');
    expect(state.settings.xpPerLevel).toBe(250);
    expect(state.version).toBe(3);
  });

  it('adds students with sanitized xp and computed level', () => {
    const state = createInitialState();
    const withStudent = addStudent(state, { id: 's1', alias: 'Alice', xp: -50 });
    expect(withStudent.students).toHaveLength(1);
    expect(withStudent.students[0]).toMatchObject({
      xp: 0,
      level: 1,
      teamId: undefined,
    });
  });

  it('respects allowNegativeXP when adding students', () => {
    const state = createInitialState({ allowNegativeXP: true });
    const withStudent = addStudent(state, { id: 's1', alias: 'Alice', xp: -25 });
    expect(withStudent.students[0].xp).toBe(-25);
  });

  it('ignores duplicate students', () => {
    const state = createInitialState();
    const once = addStudent(state, { id: 's1', alias: 'Alice' });
    const twice = addStudent(once, { id: 's1', alias: 'Bob' });
    expect(twice.students).toHaveLength(1);
    expect(twice.students[0].alias).toBe('Alice');
  });

  it('assigns new students to existing teams', () => {
    const base = addTeam(createInitialState(), { id: 't1', name: 'Rockets' });
    const state = addStudent(base, { id: 's1', alias: 'Alice', teamId: 't1' });
    expect(state.students[0].teamId).toBe('t1');
    expect(state.teams[0].memberIds).toContain('s1');
  });

  it('ignores unknown teams when adding students', () => {
    const state = addStudent(createInitialState(), { id: 's1', alias: 'Alice', teamId: 'missing' });
    expect(state.students[0].teamId).toBeUndefined();
  });

  it('adds teams and attaches known members', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addStudent(state, { id: 's2', alias: 'Bob' });
    state = addTeam(state, { id: 't1', name: 'Rockets', memberIds: ['s1', 's2', 's1', 'missing'] });

    expect(state.teams[0]).toMatchObject({ id: 't1', memberIds: ['s1', 's2'] });
    expect(state.students.map((s) => s.teamId)).toEqual(['t1', 't1']);
  });

  it('moves members to the latest team when overlapping', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addTeam(state, { id: 't1', name: 'Team One', memberIds: ['s1'] });
    state = addTeam(state, { id: 't2', name: 'Team Two', memberIds: ['s1'] });

    const oldTeam = state.teams.find((team) => team.id === 't1');
    const newTeam = state.teams.find((team) => team.id === 't2');

    expect(oldTeam?.memberIds).toHaveLength(0);
    expect(newTeam?.memberIds).toEqual(['s1']);
    expect(state.students[0].teamId).toBe('t2');
  });

  it('assigns and removes students from teams', () => {
    let state = createInitialState();
    state = addTeam(state, { id: 't1', name: 'One' });
    state = addTeam(state, { id: 't2', name: 'Two' });
    state = addStudent(state, { id: 's1', alias: 'Alice', teamId: 't1' });

    state = assignStudentToTeam(state, 's1', 't2');
    expect(state.students[0].teamId).toBe('t2');
    expect(state.teams.find((team) => team.id === 't1')?.memberIds).toHaveLength(0);
    expect(state.teams.find((team) => team.id === 't2')?.memberIds).toContain('s1');

    state = assignStudentToTeam(state, 's1', undefined);
    expect(state.students[0].teamId).toBeUndefined();
    expect(state.teams.every((team) => team.memberIds.length === 0)).toBe(true);
  });

  it('adds quests with defaults and toggles activity', () => {
    let state = createInitialState();
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 100,
      description: 'Desc',
      type: 'daily',
      target: 'team',
      isPersonalTo: undefined,
      active: false,
    });

    expect(state.quests[0]).toMatchObject({
      target: 'team',
      active: false,
    });

    state = addQuest(state, {
      id: 'q2',
      name: 'Quest 2',
      xp: 25,
      description: 'Desc',
      type: 'repeatable',
      isPersonalTo: undefined,
    });

    expect(state.quests[1]).toMatchObject({ target: 'individual', active: true });

    state = setQuestActive(state, 'q2', false);
    expect(state.quests[1].active).toBe(false);
  });

  it('awards individual quests to specified students', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      description: 'Desc',
      xp: 40,
      type: 'repeatable',
      target: 'individual',
      active: true,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12));
    vi.spyOn(Math, 'random').mockReturnValue(0.1);

    const awarded = awardQuest(state, { questId: 'q1', studentId: 's1', note: 'Great job' });
    expect(awarded.students[0].xp).toBe(40);
    expect(awarded.logs).toHaveLength(1);
    expect(awarded.logs[0].note).toBe('Great job');
  });

  it('derives personal quest target when none is specified', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 10,
      type: 'repeatable',
      target: 'individual',
      active: true,
      isPersonalTo: 's1',
    });

    const awarded = awardQuest(state, { questId: 'q1' });
    expect(awarded.students[0].xp).toBe(10);
  });

  it('blocks personal quests for other students', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addStudent(state, { id: 's2', alias: 'Bob' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 10,
      type: 'repeatable',
      target: 'individual',
      active: true,
      isPersonalTo: 's1',
    });

    const denied = awardQuest(state, { questId: 'q1', studentId: 's2' });
    expect(denied.logs).toHaveLength(0);
    expect(denied.students[1].xp).toBe(0);
  });

  it('awards team quests to all members', () => {
    let state = createInitialState();
    state = addTeam(state, { id: 't1', name: 'Team', memberIds: [] });
    state = addStudent(state, { id: 's1', alias: 'Alice', teamId: 't1' });
    state = addStudent(state, { id: 's2', alias: 'Bob', teamId: 't1' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Team Quest',
      xp: 15,
      type: 'repeatable',
      target: 'team',
      active: true,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12));

    const awarded = awardQuest(state, { questId: 'q1', teamId: 't1' });
    expect(awarded.students.map((s) => s.xp)).toEqual([15, 15]);
    expect(awarded.logs).toHaveLength(2);
  });

  it('derives team from student when awarding team quests', () => {
    let state = createInitialState();
    state = addTeam(state, { id: 't1', name: 'Team', memberIds: [] });
    state = addStudent(state, { id: 's1', alias: 'Alice', teamId: 't1' });
    state = addStudent(state, { id: 's2', alias: 'Bob', teamId: 't1' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Team Quest',
      xp: 20,
      type: 'repeatable',
      target: 'team',
      active: true,
    });

    vi.useFakeTimers();
    vi.setSystemTime(new Date(2024, 0, 1, 12));

    const awarded = awardQuest(state, { questId: 'q1', studentId: 's1' });
    expect(awarded.students.map((s) => s.xp)).toEqual([20, 20]);
  });

  it('respects personal recipients when awarding team quests', () => {
    let state = createInitialState();
    state = addTeam(state, { id: 't1', name: 'Team', memberIds: [] });
    state = addStudent(state, { id: 's1', alias: 'Alice', teamId: 't1' });
    state = addStudent(state, { id: 's2', alias: 'Bob', teamId: 't1' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Team Quest',
      xp: 20,
      type: 'repeatable',
      target: 'team',
      active: true,
      isPersonalTo: 's2',
    });

    const awarded = awardQuest(state, { questId: 'q1', teamId: 't1' });
    expect(awarded.students.map((s) => s.xp)).toEqual([0, 20]);
  });

  it('ignores inactive quests during awarding', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alice' });
    state = addQuest(state, {
      id: 'q1',
      name: 'Quest',
      xp: 20,
      type: 'repeatable',
      target: 'individual',
      active: false,
    });

    const awarded = awardQuest(state, { questId: 'q1', studentId: 's1' });
    expect(awarded).toBe(state);
  });
});
