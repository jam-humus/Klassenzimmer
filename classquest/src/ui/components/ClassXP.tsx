import React from 'react';
import { Star } from 'lucide-react';

type ThresholdMode =
  | { type: 'fixed'; value: number }
  | { type: 'perStarList'; values: number[] }
  | { type: 'scale'; base: number; factor: number };

interface Props {
  initialStars?: number;
  initialSegmentXP?: number;
  thresholdMode: ThresholdMode;
  maxStars: number;
  onStarEarned?: (newTotal: number) => void;
}

export function ClassXP({
  initialStars = 0,
  initialSegmentXP = 0,
  thresholdMode,
  maxStars,
  onStarEarned,
}: Props) {
  const [stars, setStars] = React.useState(() => Math.max(0, Math.floor(initialStars)));
  const [segmentXP, setSegmentXP] = React.useState(() => Math.max(0, Math.floor(initialSegmentXP)));
  const [fixedThresholdValue, setFixedThresholdValue] = React.useState<number | null>(() =>
    thresholdMode.type === 'fixed' ? Math.max(1, Math.floor(thresholdMode.value)) : null,
  );

  React.useEffect(() => {
    if (thresholdMode.type === 'fixed') {
      setFixedThresholdValue(Math.max(1, Math.floor(thresholdMode.value)));
    } else {
      setFixedThresholdValue(null);
    }
  }, [thresholdMode]);

  const effectiveThresholdMode = React.useMemo<ThresholdMode>(() => {
    if (thresholdMode.type === 'fixed') {
      return { ...thresholdMode, value: fixedThresholdValue ?? Math.max(1, Math.floor(thresholdMode.value)) };
    }
    return thresholdMode;
  }, [thresholdMode, fixedThresholdValue]);

  const currentThreshold = React.useMemo(
    () => getThresholdForStarIndex(effectiveThresholdMode, stars),
    [effectiveThresholdMode, stars],
  );

  const progress = Math.min(1, segmentXP / currentThreshold);

  const addClassXP = React.useCallback(
    (amount: number) => {
      if (!Number.isFinite(amount) || amount <= 0) {
        return;
      }

      let nextXP = segmentXP + amount;
      let nextStars = stars;

      while (nextStars < maxStars) {
        const threshold = getThresholdForStarIndex(effectiveThresholdMode, nextStars);
        if (nextXP < threshold) {
          break;
        }
        nextXP -= threshold;
        nextStars += 1;
        onStarEarned?.(nextStars);
      }

      setStars(nextStars);
      setSegmentXP(Math.max(0, nextXP));
    },
    [segmentXP, stars, maxStars, effectiveThresholdMode, onStarEarned],
  );

  const setNextThreshold = React.useCallback(
    (value: number) => {
      if (thresholdMode.type !== 'fixed') {
        return;
      }
      if (!Number.isFinite(value)) {
        setFixedThresholdValue(1);
        return;
      }
      const numeric = Math.max(1, Math.floor(value));
      setFixedThresholdValue(numeric);
    },
    [thresholdMode.type],
  );

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: maxStars }).map((_, index) => {
          const earned = index < stars;
          return (
            <div
              key={index}
              className={`relative grid place-items-center rounded-2xl p-2 ${earned ? 'scale-110' : 'opacity-60'} transition-transform`}
              style={{ width: 56, height: 56 }}
              aria-label={earned ? `Stern ${index + 1} verdient` : `Stern ${index + 1} ausstehend`}
            >
              <Star className={earned ? 'fill-current' : ''} size={48} />
            </div>
          );
        })}
      </div>

      <div className="w-full">
        <div className="mb-1 flex justify-between text-sm">
          <span>Klassen-XP (Stufe {stars + 1})</span>
          <span>
            {Math.min(segmentXP, currentThreshold)}/{currentThreshold}
          </span>
        </div>
        <div className="h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-700"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button onClick={() => addClassXP(50)} className="rounded-xl bg-black px-3 py-2 text-white shadow">
          +50 XP
        </button>
        <button onClick={() => addClassXP(200)} className="rounded-xl bg-black px-3 py-2 text-white shadow">
          +200 XP
        </button>

        {thresholdMode.type === 'fixed' && (
          <div className="ml-4 flex items-center gap-2">
            <label className="text-sm opacity-70" htmlFor="class-xp-next-threshold">
              Nächste Schwelle
            </label>
            <input
              id="class-xp-next-threshold"
              type="number"
              min={1}
              value={fixedThresholdValue ?? currentThreshold}
              onChange={(event) => {
                const parsedValue = Number.parseFloat(event.target.value);
                setNextThreshold(Number.isFinite(parsedValue) ? parsedValue : 1);
              }}
              className="w-24 rounded-lg border px-2 py-1"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function getThresholdForStarIndex(mode: ThresholdMode, starIndex: number): number {
  if (mode.type === 'fixed') {
    return Math.max(1, Math.floor(mode.value));
  }
  if (mode.type === 'perStarList') {
    const index = Math.min(starIndex, mode.values.length - 1);
    return Math.max(1, Math.floor(mode.values[index]));
  }
  const value = Math.floor(mode.base * Math.pow(mode.factor, starIndex));
  return Math.max(1, value);
}

export default ClassXP;
