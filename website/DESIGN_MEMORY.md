# Design Memory & User Preferences

## Core User Directives & Style Principles
- **No Glassmorphism / No Glass Effects**:
  - Never use `.glass`, `.glass-dark`, or `backdrop-blur-*` classes.
  - Rely on solid opaque backgrounds (`#fffdf9`, `#faf6f0`, `#ffffff`, `#2a1c12`) with solid structural borders (`#e2d4c0`, `#e8ddd0`).
- **No Italic Fonts**:
  - Never apply `italic` or `italic` font styles to headings or body text.
  - Use clean upright serif typography for editorial titles (`font-display font-bold`) and crisp sans-serif typography for body copy.
- **No Tracking Classes**:
  - Do not use artificial tracking modifiers (`tracking-tight`, `tracking-tighter`, `tracking-wide`, `tracking-wider`, `tracking-widest`).
  - Rely on the font's natural, readable spacing for both uppercase labels and narrative text.
- **Clinical Rigour & Transparency**:
  - Users prefer concrete clinical proof (e.g. 0.0% enamel demineralization, GDC registration, laboratory custom tray seals, ACP remineralization) over vague marketing claims.
  - Side-by-side comparison tables and interactive visualizers (such as the VITA 8-shade guide simulator) drive strong engagement and clarity.
- **Architectural Radii (No rounded-2xl / rounded-3xl Everywhere)**:
  - Avoid bubbly rounded-2xl and rounded-3xl classes across cards, stats, and imagery.
  - Use crisp, structural `rounded-lg`, `rounded-xl`, or `rounded-md` corners for precision and restraint.
- **Unified Section Width (`max-w-6xl`)**:
  - All content sections and component wrappers must use `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` to maintain strict visual alignment across the entire page.

## Color Palette & Design Tokens
- **Primary Brand Gold**: `#925a27` (Text, primary buttons, borders)
- **Warm Gold Accent**: `#cf9448` (Highlights, icons, active indicators)
- **Deep Espresso Dark**: `#2a1c12` (Dark contrast sections, video modules, footer)
- **Subtle Dark Card**: `#372418` / `#3d2a1d`
- **Soft Light Canvas**: `#fffdf9` (Main page background)
- **Warm Cream Accent**: `#faf6f0` (Section backgrounds, interactive wells)
- **Solid Warm Border**: `#e2d4c0` (Card borders, dividers)
- **Muted Division Line**: `#e8ddd0` (Subtle dividers, table rows)
- **Body Text**: `#2a1c12` (Headings and high-emphasis text)
- **Muted Body Text**: `#6b5848` (Secondary explanations, subtitles)

## Layout & Navigation Integrity
- Always mount the global `<Header />` and `<Footer />` on pages.
- Ensure all interactive elements include accessible labels and high-contrast focus/hover states.

