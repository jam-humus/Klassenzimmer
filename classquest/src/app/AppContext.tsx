import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState, ID, Quest, Settings } from '~/types/models';
import { DEFAULT_SETTINGS } from '~/core/config';
import { processAward } from '~/core/gameLogic';
import { createStorageAdapter } from '~/services/storage';
import { levelFromXP } from '~/core/xp';

type Action =
  | { type: 'INIT'; state: AppState }
  | { type: 'ADD_STUDENT'; alias: string }
  | { type: 'UPDATE_STUDENT_ALIAS'; id: ID; alias: string }
  | { type: 'REMOVE_STUDENT'; id: ID }
  | { type: 'ADD_QUEST'; quest: Quest }
  | { type: 'UPDATE_QUEST'; id: ID; updates: Partial<Pick<Quest, 'name' | 'xp' | 'type' | 'active'>> }
  | { type: 'REMOVE_QUEST'; id: ID }
  | { type: 'TOGGLE_QUEST'; id: ID }
  | { type: 'AWARD'; studentId: ID; quest: Quest }
  | { type: 'UNDO_LAST' }
  | { type: 'UPDATE_SETTINGS'; updates: Partial<AppState['settings']> }
  | { type: 'IMPORT'; json: string };

const createId = () => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

function normalizeSettings(settings?: Partial<Settings>): Settings {
  const merged: Settings = {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {}),
  };
  if (merged.onboardingCompleted == null) {
    merged.onboardingCompleted = false;
  }
  return merged;
}

function normalizeState(raw: AppState): AppState {
  const students = raw.students ?? [];
  const quests = raw.quests ?? [];
  const logs = raw.logs ?? [];
  const teams = raw.teams ?? [];
  const hasData = students.length > 0 || quests.length > 0 || logs.length > 0;
  const settings = normalizeSettings({ ...raw.settings, onboardingCompleted: hasData ? true : raw.settings?.onboardingCompleted });
  return {
    students,
    quests,
    logs,
    teams,
    settings,
    version: raw.version ?? 1,
  };
}

function markOnboardingComplete(state: AppState): AppState {
  if (state.settings.onboardingCompleted) {
    return state;
  }
  const hasData = state.students.length > 0 || state.quests.length > 0 || state.logs.length > 0;
  if (!hasData) {
    return state;
  }
  return {
    ...state,
    settings: { ...state.settings, onboardingCompleted: true },
  };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT':
      return normalizeState(action.state);
    case 'ADD_STUDENT': {
      const id = createId();
      const next: AppState = {
        ...state,
        students: [
          ...state.students,
          { id, alias: action.alias, xp: 0, level: 1, streaks: {}, lastAwardedDay: {}, badges: [] },
        ],
      };
      return markOnboardingComplete(next);
    }
    case 'UPDATE_STUDENT_ALIAS':
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === action.id ? { ...student, alias: action.alias } : student,
        ),
      };
    case 'REMOVE_STUDENT':
      return {
        ...state,
        students: state.students.filter((student) => student.id !== action.id),
        logs: state.logs.filter((log) => log.studentId !== action.id),
      };
    case 'ADD_QUEST':
      return markOnboardingComplete({ ...state, quests: [...state.quests, action.quest] });
    case 'UPDATE_QUEST':
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === action.id ? { ...quest, ...action.updates } : quest,
        ),
      };
    case 'REMOVE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== action.id),
        logs: state.logs.filter((log) => log.questId !== action.id),
      };
    case 'TOGGLE_QUEST':
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === action.id ? { ...quest, active: !quest.active } : quest,
        ),
      };
    case 'AWARD': {
      const next = processAward(state, action.studentId, action.quest);
      if (next === state || next.logs === state.logs) return next;
      const latest = next.logs[next.logs.length - 1];
      if (!latest) return next;
      const logs = [latest, ...next.logs.slice(0, -1)];
      return { ...next, logs };
    }
    case 'UNDO_LAST': {
      const [last, ...rest] = state.logs;
      if (!last) return state;
      const students = state.students.map((student) => {
        if (student.id !== last.studentId) return student;
        const nextXP = state.settings.allowNegativeXP
          ? student.xp - last.xp
          : Math.max(0, student.xp - last.xp);
        return {
          ...student,
          xp: nextXP,
          level: Math.max(1, levelFromXP(Math.max(0, nextXP), state.settings.xpPerLevel)),
        };
      });
      return { ...state, students, logs: rest };
    }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: normalizeSettings({ ...state.settings, ...action.updates }),
      };
    case 'IMPORT': {
      try {
        const parsed = JSON.parse(action.json) as AppState;
        return normalizeState(parsed);
      } catch (error) {
        console.error('Failed to import state', error);
        return state;
      }
    }
    default:
      return state;
  }
}

const Ctx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const storage = useMemo(createStorageAdapter, []);
  const [state, dispatch] = useReducer(reducer, {
    students: [],
    teams: [],
    quests: [],
    logs: [],
    settings: normalizeSettings(DEFAULT_SETTINGS),
    version: 1,
  });
  const hydratedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const saved = await storage.loadState();
        if (saved && !cancelled) {
          dispatch({ type: 'INIT', state: saved });
        }
      } finally {
        if (!cancelled) {
          hydratedRef.current = true;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storage]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    (async () => {
      await storage.saveState(state);
    })();
  }, [state, storage]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export const useApp = () => {
  const value = useContext(Ctx);
  if (!value) throw new Error('AppContext missing');
  return value;
};
