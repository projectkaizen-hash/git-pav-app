// ─── Motion durations (ms) + shared spring configs ────────────────────────────
// Use these so animations across the app feel related, not random.
// Always check AccessibilityInfo.isReduceMotionEnabled and skip/shorten if true.
export const motion = {
  // Instant feedback: press states, toggle switches, icon changes
  fast: 150,
  // Standard element transitions: enter/exit, expanding/collapsing
  base: 250,
  // Large surface transitions: bottom sheets, screen slides, hero reveals
  slow: 400,
} as const;

// Reanimated spring presets (import and spread into withSpring calls)
export const spring = {
  // Snappy — for interactive dismiss / swipe feedback
  snappy: { damping: 18, stiffness: 300, mass: 0.6 },
  // Smooth — for bottom sheets and modals entering
  smooth: { damping: 20, stiffness: 200, mass: 0.8 },
  // Gentle — for success celebrations and confetti-style moments
  gentle: { damping: 15, stiffness: 120, mass: 1 },
} as const;

// Easing curve names (for Animated / CSS transitions)
export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const;

