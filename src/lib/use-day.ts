import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { startOfDay } from './dates';

/**
 * Midnight of today on the phone's clock, as a timestamp. Moves on at midnight and whenever the
 * app comes back to the front, so "today" screens never keep showing yesterday.
 */
export function useDayStart(): number {
  const [day, setDay] = useState(() => startOfDay().getTime());

  useEffect(() => {
    const check = () => setDay(startOfDay().getTime());
    const nextMidnight = day + 24 * 60 * 60 * 1000 - Date.now() + 1_000;
    const timer = setTimeout(check, Math.max(nextMidnight, 1_000));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [day]);

  return day;
}
