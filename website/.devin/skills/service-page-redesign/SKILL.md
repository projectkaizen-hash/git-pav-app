# Service Page Redesign

Redesign service pages to match modern treatment page layouts with consistent styling, components, and user experience.

## When to Use

- When redesigning service pages (dentures, whitening, cosmetic, extraction, root canal, aesthetics)
- When standardizing page layouts across treatment services
- When modernizing outdated page designs to match current design system

## Design System Patterns

### Hero Section

**Modern hero structure:**
- Full-screen height with `min-h-[100svh] min-h-screen`
- Kenburns background with gradient overlay
- Spotlight component for visual effects
- Centered single-column layout (not two-column)
- Bottom border: `border-b border-[#e8ddd0]`
- Background: `bg-bg` with `pt-16`
- Gradient direction: `bg-gradient-to-t from-bg via-bg/85 to-bg/40`

**Content pattern:**
```tsx
<section id="top" className="relative isolate min-h-[100svh] min-h-screen overflow-hidden bg-bg pt-16 border-b border-[#e8ddd0] flex items-center">
  <div className="absolute inset-0 pointer-events-none">
    <img src="..." className="kenburns h-full w-full object-cover opacity-35" />
    <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/85 to-bg/40" />
  </div>
  <Spotlight />
  <div className="relative z-10 mx-auto w-full min-h-[calc(100svh-4rem)] max-w-6xl px-4 py-12 sm:px-6 flex flex-col justify-center items-center text-center">
    {/* Hero content */}
  </div>
</section>
```

### Page Structure

**Modern component sequence:**
1. Hero (full-screen, centered)
2. Solutions/Treatments (card grid, max-w-6xl)
3. Pricing (organized tables, max-w-6xl)
4. Benefits (minimal editorial grid, optional - replaced process/benefits sections)
5. Showcase (dark themed video cards, optional)
6. Testimonials (scrolling marquee, optional)
7. FAQ (two-column with sticky header, max-w-6xl)
8. Contact (form, optional - omitted for custom-grillz)

**Common max-width:** All sections use `max-w-6xl` for consistency.

### Solutions/Treatments Section

**Card grid layout:**
- 3-column responsive grid: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- White cards with borders: `bg-white border border-[#e2d4c0]`
- Clean shadows: `shadow-sm`
- Individual cards with icon, title, subtitle, description, benefits
- View pricing buttons at bottom of each card

### Pricing Section

**Organized pricing tables:**
- Grouped by category (Standard, Premium, Repairs)
- 2-column grid for categories: `grid md:grid-cols-2 gap-6`
- Clean white cards: `bg-white border border-[#e2d4c0]`
- Simple pricing rows with service name and price
- CTA button at bottom with disclaimer text

### Benefits Section

**Minimal editorial grid (no card boxes, no shadows):**
- Background: `bg-[#faf6f0]` with bottom border: `border-b border-[#e2d4c0]`
- 4-column responsive grid: `grid sm:grid-cols-2 lg:grid-cols-4 gap-8`
- Top border dividing line: `pt-8 border-t border-[#e2d4c0]`
- Numbered items with monospace font: `font-mono text-xs font-bold text-[#925a27]`
- Clean typography with no cards or shadows
- Content structure: Number (01-04), Title, Description

### Showcase Section

**Dark themed video cards:**
- Dark background: `bg-[#2a1c12]`
- Dark cards: `bg-[#372418] border border-[#523825]`
- White text with reduced opacity for descriptions
- Simple uppercase badges (no icons)
- Close button when video playing
- Play button with accent color

### FAQ Section

**Two-column layout:**
- Grid: `grid lg:grid-cols-[1fr_2fr] gap-14 items-start`
- Left sticky header: `lg:sticky lg:top-24`
- Right accordion with simple `divide-y` styling
- Smooth transitions: `max-h-64 opacity-100`
- Active state: `accent-gradient text-white rotate-180`
- CTA button in left column

### Testimonials Section

**Scrolling marquee:**
- Use motion/react for animations
- Scrolling columns with infinite loop
- Glass-effect cards
- Avatar initials with design system colors
- Simple modern styling matching homepage

### Contact Section

**Clean form styling:**
- White background cards: `bg-white border border-[#e2d4c0]`
- Simple form layout
- Design system colors for states
- Phone number link as secondary CTA

## Color Scheme

**Primary colors:**
- Text: `text-[#2a1c12]` (dark brown)
- Secondary: `text-[#6b5848]` (medium brown)
- Accent: `text-[#925a27]` (gold/brown)
- Primary: `text-primary` (design system token)
- Muted: `text-muted` (design system token)

**Backgrounds:**
- Main: `bg-[#fffdf9]` (cream)
- Section: `bg-bg` (design system)
- Dark: `bg-[#2a1c12]` (dark brown)
- Dark card: `bg-[#372418]`

**Borders:**
- Light: `border-[#e8ddd0]`
- Medium: `border-[#e2d4c0]`
- Dark: `border-[#3d2a1d]`
- Dark card: `border-[#523825]`

## Typography

**Display fonts:**
- Hero: `text-4xl font-medium sm:text-5xl lg:text-6xl`
- Section headers: `text-3xl sm:text-5xl font-bold`
- Card titles: `text-2xl font-bold`

**Body fonts:**
- Descriptions: `text-sm sm:text-base leading-relaxed`
- FAQ answers: `text-sm sm:text-base leading-relaxed`

## Components

### Buttons

**Primary CTA:**
```tsx
<Button size="lg" className="accent-gradient text-white rounded-full px-8 font-bold shadow-sm hover:opacity-95">
  <a href="#section">Action</a>
</Button>
```

**Secondary CTA:**
```tsx
<Button variant="outline" size="lg" className="rounded-full px-7 border-[#925a27] text-[#925a27] bg-white text-sm font-semibold hover:bg-[#faf6f0]">
  <a href="#section">Secondary</a>
</Button>
```

### Icons

**Common icons:** Use lucide-react
- Navigation: `ArrowRight`, `ChevronDown`
- Features: `Sparkles`, `ShieldCheck`, `CheckCircle2`
- Contact: `PhoneCall`, `Send`
- Media: `Play`, `X`

## Route Structure

**Clean route wrapper:**
```tsx
function Page() {
  return (
    <>
      <Header />
      <DenturesPage />
      <Footer />
    </>
  );
}
```

**No wrapper divs** - Remove `pt-16` padding divs that were used in older designs.

## Design Tokens

Use design system tokens where available:
- `text-primary` instead of custom colors
- `text-muted` for secondary text
- `bg-bg` for backgrounds
- `border-border` for borders
- `glass` for glass effects

## Page Components Reference

**Modern page examples:**
- Aesthetics: `src/components/aesthetics/aesthetics-page.tsx`
- Cosmetic: `src/components/cosmetic/cosmetic-page.tsx`
- Custom Grillz: `src/components/custom-grillz/grillz-page.tsx` (with benefits section, no contact)
- Oral Hygiene: `src/components/oral-hygiene/oral-hygiene-page.tsx` (importance & who-needs sections, no services cards)
- General Dentistry: `src/components/general-dentistry/general-dentistry-page.tsx` (comprehensive with cavities diagram, pricing tables)
- Tooth Extraction: `src/components/tooth-extraction/extraction-page.tsx`
- Root Canal: `src/components/root-canal/root-canal-page.tsx`

**Component patterns to follow:**
- Hero: Modern two-column or centered layout
- Solutions: Card grid with icons
- Pricing: Organized tables by category
- Benefits: Minimal editorial grid (cosmetic, custom-grillz)
- FAQ: Two-column with sticky header
- Showcase: Dark themed video cards

**Custom Grillz specific:**
- Use Benefits section (minimal editorial grid) instead of Process section
- No Contact section (pricing CTA links to contact page)
- Hero follows centered single-column layout

**Oral Hygiene specific:**
- Use Importance section (minimal editorial grid) instead of Services cards
- Use Who Needs section (minimal editorial grid) instead of Services cards
- Includes video showcase and consent section
- Hero follows centered single-column layout

**General Dentistry specific:**
- Includes cavities formation video with numbered steps
- Services cards grid with icons
- Importance section (minimal editorial grid)
- Individual pricing components (Root Canal, Fillings, Extractions)
- Informed consent video components (Root Canal, Tooth Extraction)
- Video showcase section
- Choosing dentist section with icon cards
- Cost and insurance information
- Hero follows centered single-column layout

## Migration Checklist

When redesigning a service page:

- [ ] Update hero to modern full-screen layout with centered content
- [ ] Change solutions to card grid layout (3 columns)
- [ ] Organize pricing into category-based tables
- [ ] Update showcase to dark themed video cards
- [ ] Convert FAQ to two-column sticky header layout
- [ ] Ensure all sections use `max-w-6xl`
- [ ] Update colors to design system tokens
- [ ] Clean up route wrapper (remove pt-16 divs)
- [ ] Test responsive behavior
- [ ] Verify border colors and spacing consistency

## Common Mistakes to Avoid

- Don't use two-column hero layouts (use centered)
- Don't use glass effects for main backgrounds (use white/dark themes)
- Don't mix border colors inconsistently
- Don't use different max-widths per section
- Don't add wrapper divs with padding in routes
- Don't use custom colors when design tokens exist
- Don't use individual styled cards for FAQ (use divide-y)

## File Organization

**Component structure:**
```
src/components/{service}/
  {service}-page.tsx       # Main page component
  {service}-hero.tsx       # Hero section
  {service}-solutions.tsx  # Treatments/solutions
  {service}-pricing.tsx    # Pricing tables
  {service}-showcase.tsx  # Video demonstrations
  {service}-testimonials.tsx # Patient reviews (optional)
  {service}-faq.tsx        # FAQ section
  {service}-contact.tsx   # Contact form (optional)
```

**Route file:**
```
src/routes/{service}.tsx   # Route definition
```