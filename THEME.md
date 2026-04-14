# NepalTrex Design System & Theme Colors

## Overview
NepalTrex uses a cohesive, nature-inspired color system inspired by the Himalayan trekking experience. All components should use these theme colors for consistency.

---

## 🎨 Core Theme Colors

### Primary Colors (Extracted from Landing Page)
These are the foundational colors used throughout the application:

| Color | Hex | Usage | Component |
|-------|-----|-------|-----------|
| **Deep Teal** | `#0f2b2d` | Dark backgrounds, main text | Body, Headers |
| **Mid Teal** | `#173b3f` | Card backgrounds, accents | Buttons, Cards |
| **Golden Sun** | `#f0b429` | Primary CTA, highlights | Buttons, Links, Accents |
| **Snow** | `#f8f4eb` | Light text, Card backgrounds | Text on dark, Light Cards |
| **Moss** | `#1e6f5c` | Secondary accent, forms | Buttons, Borders, Focus |
| **Ink** | `#102023` | Dark text | Body copy, Labels |

### Theme Object (JavaScript)
Import from `lib/theme.js`:

```javascript
import { themeColors } from '@/lib/theme';

// Access theme colors
themeColors.deepTeal   // #0f2b2d
themeColors.midTeal    // #173b3f
themeColors.goldSun    // #f0b429
themeColors.snow       // #f8f4eb
themeColors.moss       // #1e6f5c
themeColors.ink        // #102023
```

---

## 🎯 Semantic Color Mapping

Use these semantic names instead of hex codes for maintainability:

```javascript
import { themeColors } from '@/lib/theme';

// **Page Backgrounds**
background: themeColors.deepTeal     // Dark body backgrounds

// **Foreground (Text)**
color: themeColors.snow              // Light text on dark backgrounds
color: themeColors.ink               // Dark text on light backgrounds

// **Primary Buttons**
background: themeColors.moss         // Primary action buttons
color: themeColors.snow              // Text on moss buttons

// **Secondary Elements**
border: `1px solid ${themeColors.goldSun}`  // Highlights, accents
background: themeColors.midTeal              // Card containers

// **Focus States**
boxShadow: `0 0 0 3px rgba(30, 111, 92, 0.1)`  // Moss focus ring
```

---

## 🎭 Logo Component

The **Baby T-Rex Trekking Logo** is a cute, adventure-ready mascot that should appear:

### Usage

```javascript
import { BabyTrexLogo, BabyTrexLogoWithText } from '@/components/BabyTrexLogo';
import { themeColors } from '@/lib/theme';

// Logo Only
<BabyTrexLogo size={48} color={themeColors.goldSun} />

// Logo + Text
<BabyTrexLogoWithText size={36} color={themeColors.deepTeal} />
```

### Placement Guidelines
- **Header/Navigation**: Use `BabyTrexLogoWithText` at 36-48px
- **Auth Pages**: Use in circular gradient badge (70px)
- **Favicon/Branding**: Use just the logo at appropriate size
- **Loading States**: Use animated baby T-Rex for friendliness

### Color Options
- On **dark backgrounds**: Use `themeColors.goldSun` or `themeColors.snow`
- On **light backgrounds**: Use `themeColors.deepTeal` or `themeColors.moss`
- In **badges/circles**: Use `themeColors.deepTeal` as default

---

## 🎨 Pre-built Gradients

Use these ready-made gradients for consistency:

```javascript
import { gradients } from '@/lib/theme';

// Landing page background
background: gradients.landing;

// Auth card backgrounds
background: gradients.authCard;

// Hero sections
background: gradients.heroSection;

// Buttons (teal → midteal)
background: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`;
```

---

## 📐 Design System Values

### Typography
```javascript
import { typography } from '@/lib/theme';

fontSize: typography.fontSize.xs      // 0.75rem
fontSize: typography.fontSize.base    // 1rem
fontSize: typography.fontSize.xl      // 1.25rem
fontSize: typography.fontSize['2xl']  // 1.5rem
```

### Spacing
```javascript
import { spacing } from '@/lib/theme';

padding: spacing.md        // 1rem
margin: spacing.lg         // 1.5rem
gap: spacing.sm            // 0.5rem
```

### Border Radius
```javascript
import { borderRadius } from '@/lib/theme';

borderRadius: borderRadius.md      // 0.75rem
borderRadius: borderRadius.lg      // 1rem
borderRadius: borderRadius['2xl']  // 2rem
borderRadius: borderRadius.full    // 9999px
```

---

## ✅ Implementation Checklist

When building new components:

- [ ] Use theme colors from `lib/theme.js`
- [ ] Never hardcode hex colors (unless absolutely necessary)
- [ ] Use semantic color names (`primary`, `secondary`, `success`, etc.)
- [ ] Include baby T-Rex logo in branded sections
- [ ] Apply theme colors to:
  - [ ] Buttons & CTAs
  - [ ] Links & hover states
  - [ ] Form inputs & focus rings
  - [ ] Backgrounds & cards
  - [ ] Text & typography
  - [ ] Borders & dividers
- [ ] Test on both light and dark backgrounds
- [ ] Ensure sufficient contrast for accessibility

---

## 🔍 Example: Building a New Component

```javascript
import { themeColors } from '@/lib/theme';

export function MyComponent() {
  return (
    <div style={{
      background: themeColors.card,
      borderRadius: '12px',
      padding: '1rem',
      border: `1px solid ${themeColors.goldSun}`,
    }}>
      <h2 style={{ color: themeColors.ink }}>My Section</h2>
      <button style={{
        background: `linear-gradient(135deg, ${themeColors.moss} 0%, ${themeColors.midTeal} 100%)`,
        color: themeColors.snow,
        border: 'none',
        borderRadius: '8px',
        padding: '12px 24px',
      }}>
        Click Me
      </button>
    </div>
  );
}
```

---

## 🌍 Why These Colors?

The NepalTrex theme is inspired by:
- **Deep Teal & Mid Teal**: The cool mountain air and glacial waters of the Himalayas
- **Golden Sun**: The warmth of sunrise over the snow peaks
- **Snow**: Pure, pristine mountain landscapes
- **Moss**: Lush green forests and vegetation
- **Baby T-Rex Logo**: Adventure, exploration, and a playful spirit

---

## 📝 Version History

- **v1.0** (Apr 14, 2026): Initial theme system with 6 core colors, baby T-Rex logo, and design system values
- Applies to: Auth pages (signin/signup), Landing page header, Dashboard (future)

---

## 🤝 Contributing

When adding new colors or gradients:
1. Document them in this file
2. Add to `lib/theme.js`
3. Update all relevant components
4. Test across light/dark backgrounds
5. Ensure WCAG AA contrast compliance

Questions? Check `app/src/lib/theme.js` for the source of truth.
