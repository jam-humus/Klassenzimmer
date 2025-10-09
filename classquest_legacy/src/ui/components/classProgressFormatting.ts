export const classProgressNumberFormatter = new Intl.NumberFormat('de-DE');

export function getFormattedClassProgressCopy(
  view: { current: number; step: number; remaining: number },
  starLabel: string,
) {
  const formattedCurrent = classProgressNumberFormatter.format(view.current);
  const formattedStep = classProgressNumberFormatter.format(view.step);
  const formattedRemaining = classProgressNumberFormatter.format(view.remaining);
  return {
    formattedCurrent,
    formattedStep,
    formattedRemaining,
    announcement: `${formattedCurrent} / ${formattedStep} XP – noch ${formattedRemaining} XP bis zum nächsten ${starLabel}`,
  };
}
