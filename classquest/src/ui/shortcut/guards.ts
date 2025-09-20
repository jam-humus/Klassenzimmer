const PASSIVE_INPUT_TYPES = new Set(['button', 'checkbox', 'radio', 'reset', 'submit', 'range', 'color', 'file', 'image']);

export function isEditableTarget(element: HTMLElement | null): boolean {
  if (!element) {
    return false;
  }
  if (element.closest('[data-hotkey-suspend="true"]')) {
    return true;
  }
  if (element.isContentEditable) {
    return true;
  }
  const role = element.getAttribute('role');
  if (role === 'textbox') {
    return true;
  }
  const tag = element.tagName.toLowerCase();
  if (tag === 'textarea' || tag === 'select') {
    return true;
  }
  if (tag === 'input') {
    const input = element as HTMLInputElement;
    const type = input.type?.toLowerCase() || 'text';
    if (PASSIVE_INPUT_TYPES.has(type)) {
      return false;
    }
    if (input.readOnly) {
      return false;
    }
    return true;
  }
  return false;
}

export function shouldIgnoreHotkey(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) {
    return true;
  }
  const target = event.target as HTMLElement | null;
  return isEditableTarget(target);
}
