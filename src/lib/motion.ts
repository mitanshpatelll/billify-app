import { AccessibilityInfo, LayoutAnimation } from 'react-native';

// Follows the phone's Reduce Motion setting (iOS) / Remove animations (Android).
let reduceMotion = false;
void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
  reduceMotion = enabled;
});
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

/** Animates the next layout change (a cart line sliding in), unless motion is reduced. */
export function animateNextLayout(): void {
  if (!reduceMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
}
