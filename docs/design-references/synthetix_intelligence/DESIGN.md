# Design System Document: The Intelligence Layer

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Architect"**

This design system moves away from the "flat web" aesthetic to embrace a vision of structured intelligence. We are not just building a dashboard; we are building a command center for AI-driven marketing. The system avoids the "template" look by prioritizing **Tonal Depth** and **Asymmetric Balance**. 

Instead of rigid, boxed-in grids, we use expansive white space and layered surfaces to create an editorial feel. Elements should feel as though they are floating in a cohesive, data-rich environment—authoritative yet breathable. The "Digital Architect" approach uses high-contrast typography scales and overlapping components to guide the eye through dense data without causing cognitive fatigue.

---

## 2. Colors & Surface Architecture

The palette is anchored in deep cosmic navies and slate grays, punctuated by high-energy functional accents.

### The Color Tokens
*   **Background:** `#0b1326` (The void; the foundational canvas)
*   **Primary (Action):** `#adc6ff` (A soft, high-tech blue)
*   **Secondary (Success/Growth):** `#4edea3` (Emerald vibrance for positive ROI)
*   **Tertiary (Intelligence/AI):** `#bdc2ff` (A soft violet-blue for AI-specific states)
*   **Surface Tiers:**
    *   `surface_container_lowest`: `#060e20` (Inset areas)
    *   `surface_container_low`: `#131b2e` (Secondary sections)
    *   `surface_container`: `#171f33` (Standard cards)
    *   `surface_container_high`: `#222a3d` (Elevated modals)

### The "No-Line" Rule
**Strict Mandate:** Designers are prohibited from using 1px solid borders for sectioning. Structural boundaries must be defined solely through background color shifts. To separate a card from the background, place a `surface_container` element on a `surface` background. If further distinction is needed, use vertical spacing rather than a stroke.

### The "Glass & Gradient" Rule
To evoke "Automated Intelligence," use glassmorphism for floating UI elements (like hover tooltips or side-car navigation). 
*   **Glass Recipe:** `surface_variant` at 60% opacity + 20px Backdrop Blur.
*   **Signature Textures:** Use subtle linear gradients for primary CTAs, transitioning from `primary` (`#adc6ff`) to `primary_container` (`#4d8efe`) at a 135-degree angle. This adds "visual soul" and prevents the UI from looking like a generic wireframe.

---

## 3. Typography: Editorial Authority

We use **Inter** to bridge the gap between high-tech precision and readability. The hierarchy is intentionally dramatic to create an "Editorial" feel within a data-heavy environment.

*   **Display (Large Data Hero):** `display-lg` (3.5rem) / Bold. Used for primary North Star metrics (e.g., Total Conversions).
*   **Headline (Section Names):** `headline-sm` (1.5rem) / Semi-Bold. Creates clear cognitive breaks between AI workstreams.
*   **Body (Data Labels/Descriptions):** `body-md` (0.875rem) / Regular. Optimized for the slate-gray `on_surface_variant` to reduce eye strain in dark mode.
*   **Label (Micro-Data):** `label-sm` (0.6875rem) / All-Caps / Wide Tracking (+0.05em). Used for status badges and chart axes to convey a "technical readout" aesthetic.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are largely replaced by **Tonal Layering**.

*   **The Layering Principle:** Depth is achieved by stacking. A `surface_container_lowest` sidebar sits next to a `surface` main content area, which hosts `surface_container` cards. This creates a natural, "physical" architecture.
*   **Ambient Shadows:** For floating elements (Modals/Dropdowns), use an extra-diffused shadow: `box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);`. The shadow color must never be pure black; it should be a deep tint of the background color to maintain atmospheric consistency.
*   **The Ghost Border:** If a boundary is required for accessibility, use the `outline_variant` token at 15% opacity. It should feel like a suggestion of a line, not a physical barrier.

---

## 5. Components: The Intelligence Kit

### Cards & Data Containers
Forbid divider lines. Use `surface_container` for the card body and `surface_container_high` for the header area to create a "header block" look. Use the `xl` (0.75rem) roundedness for outer containers.

### AI Status Badges
Sophisticated status indicators for AI agents.
*   **Active:** `secondary_container` background with `on_secondary_container` text.
*   **Processing:** A subtle pulse animation on a `tertiary_container` dot.
*   **Error:** `error_container` with `on_error_container` text.

### Buttons
*   **Primary:** Gradient of `primary` to `primary_container`. No border. White text (`on_primary`).
*   **Secondary/Ghost:** No background. `outline` text. On hover, a `surface_bright` subtle background shift.

### Sophisticated Charts
*   **Line Charts:** Use a 2px stroke for the data line. Apply a vertical gradient fill from the line color (e.g., `secondary`) to transparent to "ground" the data.
*   **Grid Lines:** Use `outline_variant` at 10% opacity. Data must always feel like it is the hero.

### Navigation Sidebar
The sidebar should be a "Negative Space" anchor. Use `surface_container_lowest` with `label-md` typography. Active states should not use a box; use a vertical 4px pill of `primary` color on the far left and a subtle `surface_variant` background highlight.

---

## 6. Do’s and Don’ts

### Do:
*   **Do** use asymmetrical layouts. A large metric card on the left balanced by two smaller AI status cards on the right creates visual interest.
*   **Do** leverage "Negative Space." If the data is dense, increase the padding within the container to 32px (2rem).
*   **Do** use `secondary` (`#4edea3`) sparingly. It is a "reward" color for growth and success.

### Don’t:
*   **Don’t** use pure black (`#000000`). It kills the depth of the "Digital Architect" navy-slate theme.
*   **Don’t** use 100% opaque borders. They create "visual noise" and trap the user's eye in boxes.
*   **Don’t** use standard "Select" dropdowns. Design custom, glassmorphic overlays that feel integrated into the high-tech environment.