# Color Scheme Analysis: Why Volcanic Fails

**Date:** 2026-02-01
**Sources:** Gemini CLI, Codex Subagent, Kimi CLI (adversarial multi-AI analysis)

---

## Executive Summary

The Volcanic color scheme fails because it uses **shades of one color family** (red-orange-brown) for 6 distinct categories. Human perception treats these as "the same color under different lighting" rather than distinct tiers.

**User Feedback:** "I can only see orange and red - the rest looks the same"

---

## The Volcanic Scheme (Current)

| Tier | Hex | Color | Problem |
|------|-----|-------|---------|
| novice | `#1a1a1a` | Almost black | Merges with beginner |
| beginner | `#3d2817` | Dark brown | Merges with novice |
| intermediate | `#92400e` | Orange-brown | Only distinguishable tier |
| pro | `#dc2626` | Red | Same hue as advanced |
| advanced | `#ef4444` | Bright red | Same hue as pro (0° difference) |
| elite | `#fca5a5` | Light pink | Feels like "fading" not "leveling up" |

---

## Quantitative Analysis

### Delta E (Perceptual Distance)

| Transition | Delta E | Contrast Ratio | Verdict |
|------------|---------|----------------|---------|
| novice → beginner | 19.1 | 1.26 | ❌ Both dark, indistinguishable |
| beginner → intermediate | 42.1 | 1.96 | ⚠️ Low contrast |
| intermediate → pro | 36.7 | 1.47 | ❌ Jarring transition |
| **pro → advanced** | **10.7** | **1.28** | **❌ CRITICAL: 0° hue difference** |
| advanced → elite | 46.7 | 1.98 | ⚠️ Same hue, only lightness changes |

**Minimum recommended Delta E for distinct categories: >10**
**Minimum contrast ratio for accessibility: >3.0**

### The Smoking Gun (Kimi)

> Pro (#dc2626) and Advanced (#ef4444) have **0° hue difference**. They're literally the same hue, just different brightness. Your brain sees them as "the same color under different lighting," not different tiers.

---

## Why Single-Hue Gradients Fail for Categorical Data

### Gemini's Analysis

> "Single-hue gradients are excellent for **sequential data** (continuous values like temperature). Your expertise tiers are **categorical data**. Using shades of one color forces the user to perform an extra cognitive step: see the shade → compare it to memory of other 5 shades → recall the name. This is wildly inefficient."

### Codex's Analysis

> "Red is semantically overloaded (error, injury, pain), which is risky for a 'skill' metric. The palette ignores color-vision deficiencies and relies on hue differences that are weak even for normal vision."

### Kimi's Analysis

> "When you see volcanic colors, your brain thinks: 'Dark stuff... more dark stuff... orange... wait, is that red or just bright orange?... hmm, looks like the same red... and lighter red...'
>
> When you see rainbow colors, your brain thinks: 'Nothing... blue... cyan... green... gold... RED!'"

---

## Accessibility Failures

### Colorblindness (8% of males)

- **Deuteranopia/Protanopia:** The entire red-brown range collapses into indistinguishable muddy-yellowish-browns
- Users would see: `[dark] [dark] [brown] [brown] [brown] [light brown]`

### WCAG 2.1 Compliance

- Adjacent tier contrast ratios (1.26-1.98) fail the minimum 3.0 requirement
- Dark tiers on dark backgrounds violate AA standards

---

## Recommended Alternatives

### Option A: Rainbow Tier (Kimi - Recommended)

| Tier | Hex | Color | Rationale |
|------|-----|-------|-----------|
| novice | `#1a1a1a` | Black | No progress, blank slate |
| beginner | `#4338ca` | Indigo | Cool, foundational |
| intermediate | `#0891b2` | Cyan | Moving up |
| pro | `#16a34a` | Green | Solid competence |
| advanced | `#ca8a04` | Gold | Expert level |
| elite | `#dc2626` | Red | Mastery/peak |

**Why:** Each tier is 60°+ apart in hue. Brain processes them as categorically different.

---

### Option B: Qualitative Palette (Gemini)

| Tier | Hex | Color | Rationale |
|------|-----|-------|-----------|
| novice | `#6B7280` | Cool Gray | Neutral, unfilled |
| beginner | `#38BDF8` | Sky Blue | Calm, approachable |
| intermediate | `#10B981` | Emerald | Growth, progress |
| pro | `#F59E0B` | Amber | Energetic, achievement |
| advanced | `#8B5CF6` | Purple | Expertise, mastery |
| elite | `#D946EF` | Fuchsia | Peak, vibrant |

**Why:** Maximum hue separation, no adjacent colors in same family.

---

### Option C: Heatmap/Temperature (Kimi)

| Tier | Hex | Color | Rationale |
|------|-----|-------|-----------|
| novice | `#1e3a5f` | Navy | Cold, no energy |
| beginner | `#2563eb` | Blue | Cool start |
| intermediate | `#06b6d4` | Cyan | Warming up |
| pro | `#22c55e` | Green | Operating |
| advanced | `#eab308` | Yellow | Hot, expert |
| elite | `#dc2626` | Red | Maximum heat |

**Why:** Leverages universal thermal metaphor (cold→hot = low→high).

---

### Option D: Viridis Sequential (Codex)

```
#440154 → #443983 → #31688e → #21918c → #35b779 → #fde725
```

**Why:** Perceptually uniform, scientifically designed for data visualization, colorblind-safe.

---

### Option E: Accessible High-Contrast (Kimi)

| Tier | Hex | Color | Rationale |
|------|-----|-------|-----------|
| novice | `#0f172a` | Slate 900 | Dark but visible |
| beginner | `#1e40af` | Blue 800 | Clear blue |
| intermediate | `#0d9488` | Teal 600 | Distinct |
| pro | `#16a34a` | Green 600 | Achievement |
| advanced | `#f59e0b` | Amber 500 | Gold status |
| elite | `#ffffff` | White | Illuminated master |

**Why:** Elite as white = ultimate contrast, impossible to confuse.

---

## Final Verdict

### Consensus from All 3 AIs:

1. **Use RAINBOW hues, NOT single-hue gradients**
2. **Each tier needs different HUE, not just different lightness**
3. **Red has negative semantic associations** (error/danger) - use sparingly
4. **Don't rely on color alone** - add labels/tooltips for accessibility

### The Gaming Industry Standard

Games have solved this for decades:

```
Bronze → Silver → Gold → Platinum → Diamond → Master
```

Each rank is a completely different color. Nobody confuses them.

---

## Implementation Recommendation

1. Replace Volcanic scheme with **Rainbow Tier** or **Heatmap** option
2. Ensure minimum 60° hue separation between adjacent tiers
3. Test with colorblindness simulators before shipping
4. Add tier labels on hover/tap for accessibility

---

## References

- WCAG 2.1 Color Contrast Guidelines
- Delta E 2000 Perceptual Color Difference Formula
- Research: "Colorblind-Safe Color Scales for Data Visualization" (Crameri et al.)
