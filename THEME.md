# NepalTrex Design System & Theme Colors

## Brand palette

NepalTrex uses the following palette across the application. `app/src/lib/theme.js` is the source of truth; consume semantic values from `themeColors` in components rather than adding new hard-coded colors.

| Palette | Default | Role |
|---|---|---|
| Ink Black | `#001524` | Dark surfaces and primary text |
| Stormy Teal | `#15616d` | Primary controls and success states |
| Papaya Whip | `#ffecd1` | Light surfaces and text on dark backgrounds |
| Vivid Tangerine | `#ff7d00` | Calls to action, highlights, and warnings |
| Brandy | `#78290f` | Destructive actions and route emphasis |

## Semantic colors

```javascript
import { palette, themeColors, gradients } from '@/lib/theme';

themeColors.primary // Stormy Teal
themeColors.accent  // Vivid Tangerine
themeColors.error   // Brandy
themeColors.snow    // Papaya Whip
themeColors.ink     // Ink Black

palette.stormyTeal[700] // #3ec5da
palette.papayaWhip[900] // #fffbf6
```

## Usage rules

- Use `themeColors.primary` for standard actions and interactive UI.
- Use `themeColors.accent` for primary CTAs and highlighted information.
- Use `themeColors.error` for destructive or location-guidance emphasis.
- Use Papaya Whip on dark Ink Black surfaces and Ink Black on light Papaya Whip surfaces.
- Use the predefined gradients from `app/src/lib/theme.js` for branded surfaces.
- Check both light and dark modes when changing components.
