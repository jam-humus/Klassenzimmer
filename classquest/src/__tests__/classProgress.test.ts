import { describe, it, expect } from 'vitest';
import { createInitialState, addStudent, addQuest, awardQuest } from '~/core/state';
import { selectClassProgress } from '~/core/selectors/classProgress';

describe('class progress tracking', () => {
  it('accumulates XP and awards stars when thresholds are crossed', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Alex' });
    state = addQuest(state, { id: 'q1', name: 'Quest q1', xp: 1200, type: 'daily', target: 'individual' });

    const result = awardQuest(state, { questId: 'q1', studentId: 's1' });

    expect(result.classProgress.totalXP).toBe(1200);
    expect(result.classProgress.stars).toBe(1);

    const summary = selectClassProgress(result);
    expect(summary.remaining).toBe(800);
    expect(summary.nextTarget).toBe(2000);
  });

  it('clamps total XP at zero when penalties would go negative', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Blake' });
    state = addQuest(state, { id: 'gain', name: 'Gain', xp: 50, type: 'repeatable', target: 'individual' });
    state = awardQuest(state, { questId: 'gain', studentId: 's1' });
    state = addQuest(state, { id: 'penalty', name: 'Penalty', xp: -100, type: 'repeatable', target: 'individual' });

    const result = awardQuest(state, { questId: 'penalty', studentId: 's1' });

    expect(result.classProgress.totalXP).toBe(0);
    expect(result.classProgress.stars).toBe(0);
  });

  it('selectClassProgress respects custom milestone steps', () => {
    let state = createInitialState();
    state = addStudent(state, { id: 's1', alias: 'Casey' });
    state = {
      ...state,
      settings: { ...state.settings, classMilestoneStep: 200 },
      classProgress: { totalXP: 450, stars: 2 },
    };

    const summary = selectClassProgress(state);

    expect(summary.step).toBe(200);
    expect(summary.stars).toBe(2);
    expect(summary.nextTarget).toBe(600);
    expect(summary.remaining).toBe(150);
    expect(Math.round(summary.ratio * 100)).toBe(75);
  });
});
