import { EVENT_FOCUS_STUDENT, EVENT_NAVIGATE_TAB } from '~/ui/shortcut/events';
import type { AppTab } from '~/types/navigation';

type NavigateDetail = { tab: AppTab; studentId?: string };

export function navigateToAwardScreen(studentId?: string | null) {
  const detail: NavigateDetail = { tab: 'rewards' };
  if (studentId) {
    detail.studentId = studentId;
  }
  window.dispatchEvent(new CustomEvent(EVENT_NAVIGATE_TAB, { detail }));
  if (studentId) {
    window.dispatchEvent(new CustomEvent(EVENT_FOCUS_STUDENT, { detail: studentId }));
  }
}

export default navigateToAwardScreen;
