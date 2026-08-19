# Design Reference

The store's visual design and component system.

## Design Export

The complete design is exported as HTML in `../exports/store-design.html`. 

**To view:** Open the file directly in a web browser (no server needed).

This is a reference for the visual layout, component structure, and styling. It shows:
- Header and navigation
- Product listing page
- Product detail page
- Shopping cart
- Checkout form
- Admin panel layout

## Styling System

The shop uses **Tailwind CSS** with a custom color palette. Configuration is in `app/tailwind.config.ts`.

### Color Palette

```
Primary:      Blue (#0066CC)
Secondary:    Teal (#00A884)
Success:      Green (#10B981)
Warning:      Orange (#F59E0B)
Error:        Red (#EF4444)
Gray:         Gray-100 to Gray-900
Background:   White / Gray-50
Text:         Gray-900
```

Edit colors in `app/tailwind.config.ts`:

```typescript
export default {
  theme: {
    colors: {
      primary: '#0066CC',
      secondary: '#00A884',
      // ...
    }
  }
}
```

### Typography

- **Headings:** 18px (h5) to 32px (h1), weight 600
- **Body text:** 14px, weight 400, line-height 1.6
- **Small text:** 12px, weight 400, color gray-600

Font stack: System fonts (no web fonts by default to reduce load time).

### Spacing

Uses Tailwind's spacing scale (4px increments):
- Gap, padding, margin: `p-4`, `gap-8`, `m-2`, etc.
- Use 4px, 8px, 12px, 16px, 24px, 32px multiples

### Responsive Design

Mobile-first breakpoints:
- Mobile: 375px (default)
- Tablet: 768px (`md:`)
- Desktop: 1024px (`lg:`)
- Large: 1280px (`xl:`)

Example:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* 1 column on mobile, 2 on tablet, 4 on desktop */}
</div>
```

### Component Examples

**Button:**
```tsx
<button className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700">
  Click me
</button>
```

**Card:**
```tsx
<div className="border border-gray-200 rounded-lg p-6 shadow-sm">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>
```

**Product Card:**
```tsx
<div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
  <img src={product.image} alt={product.name} className="w-full h-48 object-cover" />
  <div className="p-4">
    <h3 className="font-semibold">{product.name}</h3>
    <p className="text-primary font-bold">€{formatPrice(product.price_cents)}</p>
  </div>
</div>
```

## Component Library

Reusable components live in `app/src/components/`. Add new components here and import into pages.

Common components:
- `Header.tsx` — Site navigation
- `ProductCard.tsx` — Product listing card
- `Button.tsx` — Reusable button with variants
- `Form.tsx` — Form wrappers for layouts
- `Input.tsx` — Text input, select, textarea
- `Modal.tsx` — Modals and overlays

## Dark Mode (Optional)

Tailwind supports dark mode via `dark:` classes. To enable:

1. Update `app/tailwind.config.ts`:
```typescript
export default {
  darkMode: 'class',
  // ...
}
```

2. Add `dark:` variants to components:
```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  {/* Switches based on class="dark" on <html> */}
</div>
```

3. Toggle dark mode (e.g., via a button):
```typescript
document.documentElement.classList.toggle('dark')
```

## Accessibility

Good practices to follow:

- **Contrast:** Ensure text has 4.5:1 contrast ratio on backgrounds
- **Labels:** Every form input has an associated `<label>`
- **Headings:** Use semantic `<h1>`, `<h2>`, etc. (not styled divs)
- **Alt text:** Every `<img>` has meaningful `alt` attribute
- **ARIA:** Add `aria-label` for icons without text
- **Keyboard navigation:** All interactive elements must be keyboard-accessible

Example:
```tsx
<label htmlFor="email" className="block text-sm font-medium">
  Email
</label>
<input
  id="email"
  type="email"
  className="w-full px-3 py-2 border rounded-md"
  aria-describedby="email-help"
/>
<p id="email-help" className="text-sm text-gray-600">
  We'll never share your email.
</p>
```

## Assets

### Images

- Store product images in `public/uploads/` (local dev) or S3 (production)
- Use Next.js `<Image>` component for optimization:

```tsx
import Image from 'next/image'

<Image
  src="/uploads/product.jpg"
  alt="Product name"
  width={400}
  height={400}
  className="w-full h-auto"
/>
```

### Icons

Use inline SVGs or an icon library like `react-icons`:

```bash
npm install react-icons
```

```tsx
import { FiShoppingCart } from 'react-icons/fi'

<FiShoppingCart size={24} />
```

### Fonts

The design uses system fonts by default. To add a web font:

1. Install via `next/font`:

```typescript
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })
```

2. Add to `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ['var(--font-inter)', 'sans-serif'],
}
```

3. Wrap the app with `inter.className`:

```tsx
<html className={inter.className}>
  {/* ... */}
</html>
```

## Animation

Use Tailwind's built-in animations or CSS animations:

```tsx
<div className="animate-spin">Loading...</div>
<div className="animate-pulse">Pulsing element</div>
<div className="transition-all duration-300 hover:scale-105">Hover effect</div>
```

For more complex animations, use Framer Motion:

```bash
npm install framer-motion
```

```tsx
import { motion } from 'framer-motion'

<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.5 }}
>
  Fading in...
</motion.div>
```

## Mobile Responsiveness

The design is mobile-first. Test on various screen sizes:

```bash
# Chrome DevTools
Ctrl+Shift+M  # Toggle device toolbar

# Or use media queries
@media (max-width: 640px) {
  /* Mobile styles */
}
```

Common breakpoints to test:
- iPhone SE: 375px
- iPhone 13: 390px
- iPad: 768px
- Desktop: 1024px+

## Customization Tips

### Change Brand Colors

1. Edit `app/tailwind.config.ts`
2. Update primary and secondary colors
3. Search for hardcoded colors (e.g., `#0066CC`) and replace with `primary` class

### Change Fonts

1. Install a web font via `next/font`
2. Add to `app/tailwind.config.ts` under `fontFamily`
3. Apply to `<html>` or specific elements

### Change Layout

Layouts are in `app/src/app/`. Edit the page structure as needed. Common changes:

- **Homepage:** `app/src/app/(shop)/page.tsx`
- **Product listing:** `app/src/app/(shop)/products/page.tsx`
- **Admin panel:** `app/src/app/admin/(protected)/layout.tsx`

### Add a New Page

1. Create a new folder under `app/src/app/`
2. Add `page.tsx`:

```tsx
export default function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
    </div>
  )
}
```

3. Route is automatically `/my-page`

## Performance Tips

- Use `<Image>` for all product photos (auto-optimized)
- Lazy-load images: `<Image loading="lazy" />`
- Split large components into separate files to enable code splitting
- Use `React.memo()` for components that rarely change
- Profile with Chrome DevTools Lighthouse

## Browser Support

Targets modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+

## Further Reading

- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Next.js Image Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/images)
- [Accessibility Guidelines (WCAG)](https://www.w3.org/WAI/WCAG21/quickref/)
- [Web Vitals](https://web.dev/vitals/)

---

Any design changes? Update the exported HTML in `../exports/store-design.html` and commit the changes.
