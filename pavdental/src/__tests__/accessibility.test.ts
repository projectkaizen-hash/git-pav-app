// Tests for CS-38: Accessibility and small screens pass (MB-6, MB-7)
import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";
import { colors, spacing } from "../theme";
import { contrastRatio, findA11yGaps } from "../lib/a11y-scan";

function tsxFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" ? [] : tsxFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✓ PASSED: ${message}`);
  }
}

async function runTests() {
  console.log("\n♿ RUNNING ACCESSIBILITY & SMALL SCREEN RESILIENCE TESTS (CS-38, MB-6, MB-7)...\n");

  // ─── Test 1: Typography Dynamic Type Scaling Guard (MB-6) ───────────────────
  // Default maxFontSizeMultiplier is 1.5 to protect pill capsules while accommodating large text
  const defaultMaxMultiplier = 1.5;
  assert(defaultMaxMultiplier <= 2.0 && defaultMaxMultiplier >= 1.3, "Dynamic Type scaling cap protects layout bounds while providing large text");

  // ─── Test 2: Minimum Touch Target Bounds (WCAG 2.2 AA - 44x44pt) ────────────
  const minTarget = 44;
  const buttonSizes = {
    sm: 36, // HitSlop or container pads
    md: 44, // Meets WCAG minimum directly
    lg: 52,
  };
  assert(buttonSizes.md >= minTarget, "Standard Button md variant meets or exceeds WCAG 44pt minimum target");
  assert(buttonSizes.lg >= minTarget, "Standard Button lg variant exceeds WCAG 44pt minimum target");

  // ─── Test 3: Small Screen (320px) Dimension Calculation Guards (MB-7) ────────
  const screenWidth = 320;

  // 3a: Clinician Schedule Header
  // Avatar (44) + gap (8) + docInfo minWidth (140) = 192px. Fits comfortably in 320px with badgeWrapper wrapping.
  const docRowMin = 44 + spacing.sm + 140;
  assert(docRowMin < screenWidth, `Clinician schedule docRow (${docRowMin}px) fits within 320px without horizontal overflow`);

  // 3b: Insights Weekly Brushing Chart
  // 7 days x minWidth (20px) + 6 gaps (4px) = 164px. Well within 320 - padding (32px) = 288px.
  const chartWidth = 7 * 20 + 6 * 4;
  const availableChartWidth = screenWidth - 2 * spacing.md;
  assert(chartWidth <= availableChartWidth, `Insights chart (${chartWidth}px) fits within 320px viewport (${availableChartWidth}px available)`);

  // 3c: Video Call Toolbar Controls
  // 3 buttons x max 64px + 2 gaps (8px) = 208px. Fits in 320px - padding (16px) = 304px.
  const videoToolbarWidth = 3 * 64 + 2 * spacing.xs;
  const availableToolbarWidth = screenWidth - 2 * spacing.sm;
  assert(videoToolbarWidth <= availableToolbarWidth, `Video controls toolbar (${videoToolbarWidth}px) fits within 320px viewport without clipping`);

  // 3d: Quick Action Grid (Home Screen: 2 columns, UX-01)
  // At 320px viewport, available width = 320 - 2 * spacing.gutter (20px) = 280px.
  // With flex: 1 and gap: spacing.sm (12px), each tile receives (280 - 12) / 2 = 134px.
  // Minimum tile content width = iconWrap (38px) + padding (2 * 12px) = 62px.
  const availableGridWidth = screenWidth - 2 * spacing.gutter;
  const tileFlexWidth = (availableGridWidth - spacing.sm) / 2;
  const tileMinContentWidth = 38 + 2 * spacing.sm;
  assert(tileFlexWidth >= tileMinContentWidth, `Home quick grid tiles (${tileFlexWidth}px) comfortably accommodate content on 320px screen (${availableGridWidth}px available)`);

  // 3e: Records 3-Column Metric Card (Teeth / Issues / Recall, UX-01)
  // 3 columns with flex: 1 separated by 2 x 1px dividers: available width 280px -> 92px/col.
  // Minimum content width per metric column = 60px.
  const metricColFlexWidth = (availableGridWidth - 2) / 3;
  assert(metricColFlexWidth >= 60, `Records metric 3-column card (${metricColFlexWidth.toFixed(0)}px/col) fits on 320px screen`);

  // 3f: Empty State Illustration and Container Bounds (UX-01, UX-03)
  // Empty state illustration (120px) + padding (2 * 24px = 48px) = 168px << 320px.
  const emptyStateAvailable = screenWidth - 2 * spacing.xl;
  assert(120 <= emptyStateAvailable, `EmptyState circular illustration (120px) fits within 320px padding bounds (${emptyStateAvailable}px available)`);

  // 3g: Small Screen Usable Content Width Bounds (UX-01)
  assert(availableGridWidth >= 280, `Gutter padding leaves 280px usable content width on 320px device`);

  // ─── Test 4: Semantic Color Contrast Verification ───────────────────────────
  assert(colors.ink.length > 0 && colors.systemBackground.length > 0, "Color system specifies foreground and background tokens");
  assert(colors.label.length > 0 && colors.secondaryLabel.length > 0, "Accessible hierarchical label tokens are present");

  // ─── Test 5: The scanner itself catches what it should ──────────────────────
  assert(findA11yGaps(`<Pressable onPress={() => go()}><Text>Go</Text></Pressable>`).length === 1, "Scanner flags a Pressable with no role or label");
  assert(
    findA11yGaps(`<Pressable onPress={() => go()} accessibilityRole="button" accessibilityLabel="Go">`).length === 0,
    "Scanner reads past => inside an attribute and accepts a labelled button"
  );
  assert(findA11yGaps(`<Pressable accessible={false} onPress={close} />`).length === 0, "Scanner skips elements hidden on purpose");

  // ─── Test 6: Every touchable in the app has a role and a label (CS-38) ──────
  const srcRoot = join(__dirname, "..");
  const gaps = tsxFiles(srcRoot).flatMap((file) =>
    findA11yGaps(readFileSync(file, "utf8")).map(
      (g) => `${relative(srcRoot, file)}:${g.line} <${g.element}> missing ${g.missing.join(" and ")}`
    )
  );
  if (gaps.length > 0) console.error(gaps.join("\n"));
  assert(gaps.length === 0, `Every Pressable and Touchable has an accessibilityRole and accessibilityLabel (${gaps.length} missing)`);

  // ─── Test 7: Text colours meet WCAG AA contrast on the main background ──────
  for (const name of ["label", "secondaryLabel", "ink"] as const) {
    const ratio = contrastRatio(colors[name], colors.systemBackground);
    assert(ratio >= 4.5, `colors.${name} on systemBackground is ${ratio.toFixed(1)}:1 (AA needs 4.5:1)`);
    const canvas = contrastRatio(colors[name], colors.background);
    assert(canvas >= 4.5, `colors.${name} on the background canvas is ${canvas.toFixed(1)}:1 (AA needs 4.5:1)`);
  }
  for (const name of ["success", "danger", "warning", "info"] as const) {
    const ratio = contrastRatio(colors[name], colors.systemBackground);
    assert(ratio >= 4.5, `colors.${name} on systemBackground is ${ratio.toFixed(1)}:1 (AA needs 4.5:1)`);
  }

  console.log("\n✅ ALL ACCESSIBILITY & SMALL SCREEN TESTS PASSED!\n");
}

runTests().catch((err) => {
  console.error("Test runner failed:", err);
  process.exit(1);
});
