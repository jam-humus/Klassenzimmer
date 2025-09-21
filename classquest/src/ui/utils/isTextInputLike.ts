export function isTextInputLike(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  const role = target.getAttribute('role');
  return role === 'textbox' || role === 'combobox';
}

export function shouldIgnoreNavigation(event: KeyboardEvent): boolean {
  return isTextInputLike(event.target);
}
