import { DEFAULT_SETTINGS } from './config';
import { calculateClassProgress, normalizeClassMilestoneStep } from './classProgress';
import { processAward } from './gameLogic';
import { levelFromXP } from './xp';
import { queueAppSound } from '~/audio/soundQueue';
import type {
  AppState,
  ID,
  Quest,
  QuestTarget,
  Settings,
  Student,
  Team,
} from '~/types/models';
import { normalizeThemeId } from '~/types/models';

const sanitizeXP = (xp: number | undefined, allowNegative = false) => {
  if (typeof xp !== 'number' || Number.isNaN(xp)) return 0;
  return allowNegative ? xp : Math.max(0, xp);
};

const unique = <T>(values: T[]) => Array.from(new Set(values));

const getTimestamp = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

const updateTeamMembership = (teams: Team[], teamId: ID | undefined, studentId: ID) =>
  teams.map((team) => {
    const members = new Set(team.memberIds);
    members.delete(studentId);

    if (teamId && team.id === teamId) {
      members.add(studentId);
    }

    return {
      ...team,
      memberIds: Array.from(members),
    } satisfies Team;
  });

const detachMembersFromTeams = (teams: Team[], memberIds: ID[]) =>
  teams.map((team) => ({
    ...team,
    memberIds: team.memberIds.filter((memberId) => !memberIds.includes(memberId)),
  }));

const mapStudentsWithTeams = (students: Student[], teamId: ID, memberIds: ID[]) =>
  students.map((student) =>
    memberIds.includes(student.id)
      ? { ...student, teamId }
      : student.teamId === teamId && !memberIds.includes(student.id)
        ? { ...student, teamId: undefined }
        : student,
  );

const buildTeam = (team: Team, existingStudents: Student[]) => {
  const knownMemberIds = team.memberIds.filter((memberId) =>
    existingStudents.some((student) => student.id === memberId),
  );

  return {
    ...team,
    memberIds: unique(knownMemberIds),
  } satisfies Team;
};


export const createInitialState = (
  settings?: Partial<Settings>,
  version = 1,
): AppState => {
  const { flags, ...restSettings } = settings ?? {};
  const theme = normalizeThemeId(restSettings.theme ?? DEFAULT_SETTINGS.theme, DEFAULT_SETTINGS.theme);
  const normalizedSettings: Settings = {
    ...DEFAULT_SETTINGS,
    ...restSettings,
    theme,
    flags: {
      ...(DEFAULT_SETTINGS.flags ?? {}),
      ...((flags ?? {}) as Record<string, boolean>),
    },
  };
  normalizedSettings.classMilestoneStep = normalizeClassMilestoneStep(
    normalizedSettings.classMilestoneStep,
  );

  return {
    students: [],
    teams: [],
    quests: [],
    logs: [],
    settings: normalizedSettings,
    version,
    classProgress: calculateClassProgress(0, normalizedSettings.classMilestoneStep),
    badgeDefs: [],
    categories: [],
  };
};

type StudentInput = {
  id: ID;
  alias: string;
  xp?: number;
  teamId?: ID;
};

export const addStudent = (state: AppState, input: StudentInput): AppState => {
  if (state.students.some((student) => student.id === input.id)) {
    return state;
  }

  const sanitizedXP = sanitizeXP(input.xp, state.settings.allowNegativeXP);
  const targetTeam = input.teamId ? state.teams.find((team) => team.id === input.teamId) : undefined;

  const student: Student = {
    id: input.id,
    alias: input.alias,
    xp: sanitizedXP,
    level: Math.max(1, levelFromXP(sanitizedXP, state.settings.xpPerLevel)),
    streaks: {},
    lastAwardedDay: {},
    badges: [],
    teamId: targetTeam?.id,
    avatarMode: 'procedural',
    avatarPack: { stageKeys: [null, null, null] },
  };

  const teams = targetTeam
    ? updateTeamMembership(state.teams, targetTeam.id, student.id)
    : state.teams;

  return {
    ...state,
    students: [...state.students, student],
    teams,
  };
};

type TeamInput = {
  id: ID;
  name: string;
  memberIds?: ID[];
};

export const addTeam = (state: AppState, input: TeamInput): AppState => {
  if (state.teams.some((team) => team.id === input.id)) {
    return state;
  }

  const memberIds = unique(input.memberIds ?? []);
  const team: Team = buildTeam({ id: input.id, name: input.name, memberIds }, state.students);

  const students = team.memberIds.length
    ? mapStudentsWithTeams(state.students, team.id, team.memberIds)
    : state.students;

  const teams = team.memberIds.length
    ? detachMembersFromTeams(state.teams, team.memberIds)
    : state.teams;

  return {
    ...state,
    teams: [...teams, team],
    students,
  };
};

export const assignStudentToTeam = (
  state: AppState,
  studentId: ID,
  teamId: ID | undefined,
): AppState => {
  const studentExists = state.students.some((student) => student.id === studentId);
  if (!studentExists) return state;

  const team = teamId ? state.teams.find((t) => t.id === teamId) : undefined;

  const students = state.students.map((student) =>
    student.id === studentId ? { ...student, teamId: team?.id } : student,
  );
  const teams = updateTeamMembership(state.teams, team?.id, studentId);

  return {
    ...state,
    students,
    teams,
  };
};

type QuestInput = Omit<Quest, 'active' | 'target'> & {
  target?: QuestTarget;
  active?: boolean;
};

export const addQuest = (state: AppState, input: QuestInput): AppState => {
  if (state.quests.some((quest) => quest.id === input.id)) {
    return state;
  }

  const quest: Quest = {
    ...input,
    active: input.active ?? true,
    target: input.target ?? 'individual',
  };

  return {
    ...state,
    quests: [...state.quests, quest],
  };
};

export const setQuestActive = (state: AppState, questId: ID, active: boolean): AppState => ({
  ...state,
  quests: state.quests.map((quest) =>
    quest.id === questId
      ? {
          ...quest,
          active,
        }
      : quest,
  ),
});

type AwardParams = {
  questId: ID;
  studentId?: ID;
  teamId?: ID;
  note?: string;
};

export const awardQuest = (state: AppState, { questId, studentId, teamId, note }: AwardParams): AppState => {
  const quest = state.quests.find((q) => q.id === questId);
  if (!quest || !quest.active) {
    return state;
  }

  const awardStudent = (
    currentState: AppState,
    targetId: ID,
  ): { state: AppState; changed: boolean } => {
    const timestamp = getTimestamp();
    const before = currentState.students.find((s) => s.id === targetId);
    if (!before) {
      return { state: currentState, changed: false };
    }

    const nextState = processAward(currentState, targetId, quest, note);
    if (nextState === currentState) {
      return { state: currentState, changed: false };
    }

    const after = nextState.students.find((s) => s.id === targetId) ?? before;
    const gainedBadge = (after.badges?.length ?? 0) > (before.badges?.length ?? 0);
    const leveledUp = after.level > before.level;

    const prioritizedEvent = gainedBadge
      ? 'badge_award'
      : leveledUp
        ? 'level_up'
        : 'xp_awarded';

    queueAppSound(prioritizedEvent, timestamp);

    return { state: nextState, changed: true };
  };

  if (quest.target === 'individual') {
    const targetStudent = studentId ?? quest.isPersonalTo;
    if (!targetStudent) return state;
    if (quest.isPersonalTo && quest.isPersonalTo !== targetStudent) {
      return state;
    }

    const result = awardStudent(state, targetStudent);
    return result.changed ? result.state : state;
  }

  const resolvedTeamId = teamId
    ?? (studentId
      ? state.students.find((student) => student.id === studentId)?.teamId
      : undefined);
  if (!resolvedTeamId) return state;

  const team = state.teams.find((t) => t.id === resolvedTeamId);
  if (!team) return state;

  let nextState = state;
  let changed = false;
  for (const memberId of team.memberIds) {
    if (quest.isPersonalTo && quest.isPersonalTo !== memberId) {
      continue;
    }
    const result = awardStudent(nextState, memberId);
    nextState = result.state;
    if (result.changed) {
      changed = true;
    }
  }

  return changed ? nextState : state;
};
