import React, { createContext, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import type { AppState, ID, Quest } from '~/types/models';
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

function reducer(state: AppState, a: Action): AppState {
  switch (a.type) {
    case 'INIT': {
      const s = a.state;
      const onboardingCompleted =
        s.settings.onboardingCompleted ??
        (s.students.length > 0 || s.quests.length > 0 || s.logs.length > 0);
      return {
        ...s,
        settings: {
          ...DEFAULT_SETTINGS,
          ...s.settings,
          onboardingCompleted,
        },
      };
    }
    case 'ADD_STUDENT': {
      const id = globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);
      return {
        ...state,
        students: [
          ...state.students,
          { id, alias: a.alias, xp: 0, level: 1, streaks: {}, lastAwardedDay: {}, badges: [] },
        ],
      };
    }
    case 'UPDATE_STUDENT_ALIAS':
      return {
        ...state,
        students: state.students.map((student) =>
          student.id === a.id ? { ...student, alias: a.alias } : student,
        ),
      };
    case 'REMOVE_STUDENT':
      return {
        ...state,
        students: state.students.filter((s) => s.id !== a.id),
        logs: state.logs.filter((l) => l.studentId !== a.id),
      };
    case 'ADD_QUEST':
      return { ...state, quests: [...state.quests, a.quest] };
    case 'UPDATE_QUEST':
      return {
        ...state,
        quests: state.quests.map((quest) =>
          quest.id === a.id ? { ...quest, ...a.updates } : quest,
        ),
      };
    case 'REMOVE_QUEST':
      return {
        ...state,
        quests: state.quests.filter((quest) => quest.id !== a.id),
        logs: state.logs.filter((log) => log.questId !== a.id),
      };
    case 'TOGGLE_QUEST':
      return {
        ...state,
        quests: state.quests.map((q) => (q.id === a.id ? { ...q, active: !q.active } : q)),
      };
    case 'AWARD': {
      const next = processAward(state, a.studentId, a.quest);
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
        settings: { ...state.settings, ...a.updates },
      };
    case 'IMPORT':
      return reducer(
        state,
        {
          type: 'INIT',
          state: JSON.parse(a.json) as AppState,
        },
      );
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
    settings: { ...DEFAULT_SETTINGS },
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
  const v = useContext(Ctx);
  if (!v) throw new Error('AppContext missing');
  return v;
};
