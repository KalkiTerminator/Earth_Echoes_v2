---
name: Earth's Echoes
colors:
  surface: '#131316'
  surface-dim: '#131316'
  surface-bright: '#39393c'
  surface-container-lowest: '#0e0e10'
  surface-container-low: '#1c1b1e'
  surface-container: '#201f22'
  surface-container-high: '#2a2a2c'
  surface-container-highest: '#353437'
  on-surface: '#e5e1e5'
  on-surface-variant: '#bbcac0'
  inverse-surface: '#e5e1e5'
  inverse-on-surface: '#313033'
  outline: '#85948b'
  outline-variant: '#3c4a42'
  surface-tint: '#45dfa4'
  primary: '#5af0b3'
  on-primary: '#003825'
  primary-container: '#34d399'
  on-primary-container: '#00563b'
  inverse-primary: '#006c4b'
  secondary: '#a4c9ff'
  on-secondary: '#00315d'
  secondary-container: '#0267b8'
  on-secondary-container: '#d6e5ff'
  tertiary: '#d4d7d9'
  on-tertiary: '#2d3133'
  tertiary-container: '#b9bbbd'
  on-tertiary-container: '#484b4d'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#68fcbf'
  primary-fixed-dim: '#45dfa4'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#e0e3e5'
  tertiary-fixed-dim: '#c4c7c9'
  on-tertiary-fixed: '#191c1e'
  on-tertiary-fixed-variant: '#444749'
  background: '#131316'
  on-background: '#e5e1e5'
  surface-variant: '#353437'
typography:
  display-lg:
    fontFamily: Instrument Serif
    fontSize: 84px
    fontWeight: '400'
    lineHeight: 92px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Instrument Serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 52px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Instrument Serif
    fontSize: 48px
    fontWeight: '400'
    lineHeight: 56px
  headline-md-mobile:
    fontFamily: Instrument Serif
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 38px
  title-sm:
    fontFamily: IBM Plex Mono
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 24px
    letterSpacing: 0.05em
  body-md:
    fontFamily: IBM Plex Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  label-xs:
    fontFamily: IBM Plex Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.1em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  container-max: 1440px
---

## Brand & Style

The design system is built to evoke a sense of profound scale, blending the precision of a scientific instrument with the emotional gravity of a high-end editorial gallery. It serves an audience that values environmental consciousness, deep exploration, and cinematic storytelling.

The aesthetic follows a **Cinematic HUD-meets-Gallery** approach. This combines the clean, data-rich aesthetics of futuristic interfaces (Head-Up Displays) with the expansive, breathable layouts of prestige digital publishing. The UI acts as a subtle frame for high-resolution imagery of rare species, using high-contrast typography and translucent layers to maintain depth without distracting from the subject matter. The emotional response should be one of "Scientific Awe"—a quiet, focused atmosphere that feels both advanced and deeply grounded in the natural world.

## Colors

The palette is rooted in a deep obsidian foundation, creating a "void" that allows biological imagery to emerge with maximum vibrance.

- **Base:** The primary canvas is `#060608`. Deep blacks are used to minimize visual noise and enhance the cinematic "infinite space" feel.
- **Accents:** Vibrant emerald (`#34d399`) represents life, growth, and the "remaining" species. Ethereal blue (`#60a5fa`) is used for technical data, "lost" species metadata, and navigational highlights.
- **Surface & Text:** Grays are used sparingly; instead, semi-transparent whites and the tertiary `#f8fafc` are used for high-readability text and hairline borders to maintain a lightweight, technical feel.

## Typography

This design system utilizes a high-contrast typographic pairing to bridge the gap between biological elegance and scientific data.

- **Instrument Serif:** Used for large-scale storytelling, names of species, and chapter titles. It should be set with tight letter-spacing in display sizes to emphasize its vertical elegance.
- **IBM Plex Mono:** Used for all functional UI, data points (extinction year, population count, coordinates), and body copy. The monospaced nature reinforces the "atlas" and "archive" narrative.

All labels and technical data should be set in uppercase with increased letter-spacing to enhance the HUD aesthetic.

## Layout & Spacing

The layout philosophy follows a **Fluid Grid with Intentional Voids**. Wide margins and generous gutters allow the content to feel like artifacts in a museum rather than a dense database.

- **Desktop:** A 12-column grid with 64px outer margins. Elements often span the center 8 columns to create a focused, editorial column.
- **Mobile:** A 4-column grid with 20px margins. Headlines are allowed to break the grid or bleed off-edge for a more dynamic, cinematic feel.
- **Rhythm:** All spacing is based on a 4px baseline, but macro-layouts should favor larger increments (32px, 64px, 128px) to maintain the "expansive" brand personality.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** and layering rather than traditional shadows.

1.  **Backdrop Blurs:** Any overlay or floating panel (like a navigation bar or data card) must use a high-saturation backdrop blur (20px-40px) and a semi-transparent background (`rgba(6, 6, 8, 0.6)`).
2.  **Hairline Borders:** Surfaces are defined by 0.5px or 1px "glass" borders. Use a top-down linear gradient for borders (White at 20% opacity to White at 5% opacity) to simulate light catching the edge of a glass pane.
3.  **Z-Axis:** Backgrounds should feature a subtle, slow-moving starfield or particle noise to create a sense of infinite distance behind the UI layers.

## Shapes

The shape language is sharp and precise, leaning toward a technical aesthetic. 

- **Corners:** General containers use a subtle "Soft" radius (4px) to avoid the harshness of a pure 90-degree angle while maintaining a professional, engineered feel. 
- **Buttons:** Functional elements use square corners or 2px radii to emphasize the "instrument" aesthetic. 
- **Interactive States:** Use "clipped corner" shapes (dog-ears) for decorative data points to further push the futuristic HUD visual.

## Components

- **Primary Buttons:** Ghost-style buttons with a 1px border of `#34d399`. On hover, the button fills with a low-opacity glow of the same color, and the text (IBM Plex Mono) gains a subtle "neon" outer glow.
- **Data Chips:** Small, pill-shaped or rectangular tags with `#60a5fa` text. Used for status indicators (e.g., "EXTINCT", "CRITICALLY ENDANGERED"). Background should be a 10% opacity fill of the text color.
- **Navigation:** A minimal, top-aligned bar with a heavy backdrop blur. Links use `label-xs` typography.
- **Information Cards:** "Glass" containers with hairline borders. They should feel weightless. Use `IBM Plex Mono` for all content within the card to maintain the data-heavy look.
- **Input Fields:** Bottom-border only (1px), using the secondary blue color. Placeholder text should be 40% opacity.
- **The "Echo" Pulse:** An animated component consisting of concentric, fading rings. Used on maps or image focal points to indicate where a species was last sighted.