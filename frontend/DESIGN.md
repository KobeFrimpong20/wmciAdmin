---
name: Production Launchpad
description: An anti-slop Next.js starter kit with design guardrails.
colors:
  warm-paper: "#fafaf9"
  white-sheet: "#ffffff"
  hairline-stone: "#e7e5e4"
  graphite-ink: "#1c1917"
  pencil-gray: "#57534e"
  editorial-navy: "#1f3a5f"
  navy-hover: "#436e93"
  navy-pressed: "#17304d"
  navy-wash: "#eef3f8"
typography:
  display:
    fontFamily: "Lora, ui-serif, Georgia, serif"
    fontSize: "3rem"
    fontWeight: 400
    lineHeight: 1.25
  headline:
    fontFamily: "Lora, ui-serif, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 400
  title:
    fontFamily: "Lora, ui-serif, Georgia, serif"
    fontSize: "1.5rem"
    fontWeight: 400
  body:
    fontFamily: "Work Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
spacing:
  gutter: "24px"
components:
  button-primary:
    backgroundColor: "{colors.editorial-navy}"
    textColor: "{colors.white-sheet}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-primary-hover:
    backgroundColor: "{colors.navy-hover}"
  button-primary-active:
    backgroundColor: "{colors.navy-pressed}"
  button-secondary:
    backgroundColor: "{colors.white-sheet}"
    textColor: "{colors.graphite-ink}"
    rounded: "{rounded.md}"
    padding: "10px 20px"
  button-secondary-hover:
    backgroundColor: "{colors.navy-wash}"
    textColor: "{colors.editorial-navy}"
  panel:
    backgroundColor: "{colors.warm-paper}"
    rounded: "{rounded.lg}"
    padding: "32px"
---

# Design System: Production Launchpad

## Overview

**Creative North Star: "The Editorial Desk"**

Print-magazine restraint applied to a product site. Navy ink on warm paper, serif headlines set with confidence, and copy given room to breathe. The page persuades the way a good editorial spread does: hierarchy, measure and specific words do the work, not effects.

The system is flat and quiet. Surfaces are separated by hairline borders and tonal shifts, never by floating shadows. Colour is used sparingly: one navy accent against a warm-gray neutral ramp. The slop-free lint rules in `eslint-rules/` encode the system's hardest refusals and always win over taste.

**Key Characteristics:**
- Serif headlines, sans body, mono only for code, data and numbers.
- One accent colour, navy, used for actions and small emphasis.
- Flat surfaces defined by 1px borders, no elevation.
- Soft, consistent corners.
- No decoration that carries no information: no emoji, gradients, glows or fade-ins.

## Colors

A warm-gray paper palette with a single deep navy ink.

### Primary
- **Editorial Navy** (accent-700): the only accent. Primary buttons, links and small mono callouts. Its rarity is what makes it read as an action.
- **Navy Hover** (accent-500): primary button hover. It lightens on hover because the dark fill can't get visibly darker.
- **Navy Pressed** (accent-800): primary button active state.
- **Navy Wash** (accent-50): secondary hover fills and soft tags.

### Neutral
- **Warm Paper** (neutral-50): page background and inset panels.
- **White Sheet**: raised surfaces such as forms and the token preview panels.
- **Graphite Ink** (neutral-900): headings and body text.
- **Pencil Gray** (neutral-600): supporting copy, captions and labels.
- **Hairline Stone** (neutral-200): every border and divider.

The full 50–950 ramps for both families live in `src/app/globals.css` and are shown at `/tokens`.

### Named Rules
**The One Ink Rule.** Navy is the only accent. Never add a second hue, and never put purple in a gradient (`no-purple-gradient`).

**The Token-Only Rule.** Components use semantic token classes (`bg-accent`, `text-muted-foreground`, `border-border`), never raw hex values or Tailwind's built-in palette.

## Typography

**Display Font:** Lora (with ui-serif, Georgia)
**Body Font:** Work Sans (with ui-sans-serif, system-ui)
**Label/Mono Font:** IBM Plex Mono (with ui-monospace)

**Character:** A literary serif for voice paired with a clear, slightly warm grotesque for reading and UI. Mono appears only where the content really is code or data.

### Hierarchy
- **Display** (Lora 400, 3rem rising to 3.75rem at `sm`, leading-tight): one h1 per page.
- **Headline** (Lora 400, 2.25rem): section headings on the landing page.
- **Title** (Lora 400, 1.5rem): sub-section headings.
- **Body** (Work Sans 400, 1rem; 1.125rem for lead paragraphs): copy and UI text, with lead paragraphs capped near `max-w-xl`.
- **Label** (IBM Plex Mono 400, 0.75–0.875rem): rule numbers, token names and code. Never below 0.75rem.

### Named Rules
**The Three Voices Rule.** Exactly three families, each with one role (`typeface-roles`). Use the `font-heading`, `font-body` and `font-accent` classes, never `font-sans`, `font-serif`, `font-mono`, `font-[…]` or inline `fontFamily`.

**The No Eyebrow Rule.** No tracked-caps kicker label above a hero headline. Fold the kicker into the headline or the lead paragraph instead.

## Layout

A single centred column with a 24px gutter (`px-6`). Width follows the job: `max-w-5xl` for the landing page, `max-w-3xl` for reference pages, `max-w-sm` for auth forms. Sections are spaced generously (`pt-24`/`pb-20`, with `sm:pt-32` on the hero), and stacks use flex gaps rather than margins. The FAQ puts its heading beside the questions (`1fr 2fr`) at `md`, and every layout collapses to one column on phones. Paragraphs use `text-wrap: pretty` so a single word doesn't sit alone on the last line.

## Elevation & Depth

The system is fully flat. Depth comes from tonal layering (white sheet on warm paper) and 1px hairline borders, never from shadows.

### Named Rules
**The Flat Desk Rule.** No shadows on surfaces. If one is ever needed for an overlay, it stays at `shadow-lg` or below, with a custom blur of 20px at most (`no-massive-shadows`).

## Shapes

Soft, consistent corners at three sizes: 6px (`rounded-sm`) for inputs, tags and small controls; 10px (`rounded-md`) for buttons; 16px (`rounded-lg`) for panels. Borders are always 1px in Hairline Stone.

### Named Rules
**The Single Surface Rule.** Never put a padded, rounded, filled or bordered surface inside another one (`no-nested-cards`).

## Components

### Buttons
Confident and plain. Use `<Button>` or `buttonStyles()` from `src/components/button.tsx`.
- **Shape:** gently rounded (10px).
- **Primary:** Editorial Navy fill, white Work Sans 0.875rem medium text, 10px × 20px padding.
- **Secondary:** white fill, 1px hairline border, graphite text. On hover the border and text turn navy over a Navy Wash fill.
- **Focus:** 2px navy outline with a 2px offset. Colour transitions only, no movement.
- **Labels:** name the specific action (`specific-cta`), never "Get started", "Learn more" or "Submit".

### Chips / Tags
- **Style:** Navy Wash fill, accent-700 text, 6px radius, Work Sans 0.75rem medium.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Warm Paper inset on a white page, or White Sheet on paper.
- **Border:** 1px Hairline Stone.
- **Internal Padding:** 24–32px.
- One level only, per the Single Surface Rule.

### Inputs / Fields
- **Style:** White Sheet fill, 1px hairline border, 6px radius, Work Sans 1rem, with labels in Work Sans 0.875rem medium above the field.
- **Focus:** the border turns Editorial Navy.

### FAQ accordion
Native `<details>` elements sharing `name="faq"`, so the browser keeps one answer open at a time with no JavaScript. The first answer starts open.
- **Rows:** hairline dividers between questions, no surface or fill.
- **Question:** Lora 1.25rem graphite, turning navy on hover, with a muted chevron that rotates when open.
- **Answer:** Work Sans in Pencil Gray, capped at `max-w-prose`, with code in IBM Plex Mono.

## Do's and Don'ts

### Do:
- **Do** run `npm run lint`, `npm run slop-score` and `npm run design:check` before calling UI work done.
- **Do** make every email, phone number and URL a real link (`actionable-contact-info`).
- **Do** keep functional text at 12px or larger and keep text contrast at WCAG AA (4.5:1) or better.
- **Do** write testimonials in sentence case if any are ever added (`no-shouty-quotes`), and only real ones.

### Don't:
- **Don't** use emoji (`limited-emoji`).
- **Don't** fade or slide in page content on load (`no-fade-animations`). Overlays may animate.
- **Don't** use purple, violet or neon gradients, or any gradient as decoration.
- **Don't** put a tracked-caps eyebrow label above a hero headline.
- **Don't** add a fourth font family or use a family outside its role.
