# Whitening Page Redesign — Implementation Plan

## Executive Summary
This document records the finalized design synthesis for the **Pavilion Dental Whitening** service page (`/whitening`). Following the Design Lab workflow and direct user review, the page promotes a refined **Variant F master synthesis** combining the interactive utility of **Variant B** with the clinical credibility of **Variant D**, strictly governed by solid-color styling rules.

---

## Direct User Constraints & Design Principles
1. **Solid Surfaces Only (No Glassmorphism)**
   - All glass effect classes (`.glass`, `.glass-dark`, `backdrop-blur-*`) have been removed.
   - Replaced with clean, opaque solid surfaces (`bg-white`, `bg-[#faf6f0]`, `bg-[#fffdf9]`, `bg-[#2a1c12]`) and crisp structural borders (`#e2d4c0`, `#e8ddd0`).
2. **Upright Clean Typography (No Italic Fonts)**
   - All `italic` classes removed.
   - Clean, professional upright serif display headlines (`font-display font-bold`) and high-legibility sans body copy.
3. **Standard Natural Font Spacing (No Tracking Styles)**
   - Removed all artificial tracking (`tracking-tight`, `tracking-widest`, `tracking-wider`, `tracking-wide`, `tracking-tighter`).
   - Standard natural letterforms for optimal clinical legibility across all screen sizes.
4. **Architectural Radii (No rounded-2xl Everywhere)**
   - Avoided repetitive bubbly border-radii (`rounded-2xl`, `rounded-3xl`).
   - Replaced with crisp, structural geometry (`rounded-lg`, `rounded-xl`, `rounded-md`) for clinical precision.
5. **Unified Max Width (`max-w-6xl`)**
   - All component containers strictly adhere to `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` for consistent grid alignment throughout the entire page.

---

## Component Architecture & Hierarchy

### 1. WhiteningHero (`src/components/whitening/whitening-hero.tsx`)
- **Headline**: "Designed by Dentists, Perfected for You."
- **Badges & Trust**:
  - Solid pill: "Doctor-Prescribed Whitening Care" with Microscope icon
  - Solid card: "Verified Clinical Result — Up to 10 Shades Whiter (Zero Pain)"
  - Solid GDC Registered Clinic tag
- **Stats Matrix**:
  - Up to 10 Shades Whiter
  - 0.0% Enamel Demineralization
  - 100% GDC Supervised
- **Direct Actions**: "Simulate Your Shade" (anchors to visualizer) and "Watch Doctor Consultation" (anchors to clinical video).

### 2. WhiteningEvidence (`src/components/whitening/whitening-evidence.tsx`)
- Three solid clinical evidence pillars (derived from Variant D):
  1. **0.0% Demineralization**: Neutral pH buffer prevents micro-pitting and enamel softening.
  2. **GDC-Registered Supervision**: Full compliance with UK dental prescribing regulations.
  3. **ACP Hydroxyapatite Seal**: Active remineralization locks in brightness and prevents thermal sensitivity.

### 3. WhiteningVisualizer (`src/components/whitening/whitening-visualizer.tsx`)
- **Interactive 8-Shade VITA Bleach Guide Simulator** (derived from Variant B):
  - 8 clinical shades: `A4` (Deep Amber Stain), `A3.5` (Warm Honey), `A3` (Natural Warmth), `A2` (Soft Champagne), `A1` (Light Ivory), `B1` (Pearl Bright), `BL2` (Hollywood Luminescence), and `BL1` (Ultra Diamond Pearl).
  - Dynamic swatch preview showing real hex color, VITA code, clinical stage, and expected lift.
  - Recommended treatment suite trigger (automatically prescribes Home UV LED Kit or Custom Home Suite based on current discolouration level).
  - Smooth range slider plus individual clickable pill buttons for instant shade jumping.

### 4. WhiteningVideo (`src/components/whitening/whitening-video.tsx`)
- **Doctor-Led Consultation & Clinical Consent** (derived from Variant D):
  - Solid deep background (`bg-[#2a1c12]`).
  - Dr. M. Hussain explaining why custom laboratory trays prevent chemical gum burns.
  - Four key clinical safety checkpoints with solid checkmark badges.
  - Interactive video player toggle playing clinic video reel.

### 5. WhiteningComparison (`src/components/whitening/whitening-comparison.tsx`)
- **3-Tier System Side-by-Side Comparison Matrix** (derived from Variant B):
  - Compares:
    1. Professional Whitening Strips (£25)
    2. Custom Home Whitening Suite (£295 — Dentist Gold Standard, solid highlighted column)
    3. Home UV LED Accelerator System (£99)
  - Metrics: Maximum Shade Lift, Tray/Delivery System, Active Enamel Protection, Treatment Protocol, Clinical Suitability, GDC Clinical Review, and Direct CTA buttons.

### 6. WhiteningProducts (`src/components/whitening/whitening-products.tsx`)
- Detailed specifications for each treatment option with alternating layout, solid rating badges, and clear benefit lists.

### 7. WhiteningAwards (`src/components/whitening/whitening-awards.tsx`)
- Solid accreditation cards for GDC Certified, Vegan Formula, Award Winning 2024, ISO Certified, and 4.9 Rating.

### 8. WhiteningFaq (`src/components/whitening/whitening-faq.tsx`)
- Comprehensive clinical FAQ accordion covering enamel safety, sensitivity, longevity, crowns/veneers, and pregnancy precautions.

### 9. WhiteningContact (`src/components/whitening/whitening-contact.tsx`)
- Solid consultation and assessment booking card with interactive treatment selector and GDPR compliance guarantee.

---

## Cleaned Artifacts
All temporary Design Lab files (`src/routes/design-lab.tsx`, `src/components/design-lab/`, `.claude-design/`) have been permanently removed. Production code is cleanly organized in `src/components/whitening/` and `src/routes/whitening.tsx`.

