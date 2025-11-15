# 🎨 MBG Design System - Dark Mesh Aurora

## Design Philosophy

**Core Concept**: **Dark Mesh Aurora dengan White Typography**

Platform MBG menggunakan desain **dark-first** dengan gradient mesh backgrounds yang menciptakan efek aurora. Typography menggunakan **white (#FFFFFF)** sebagai warna utama untuk optimal contrast dan readability.

---

## Color System

### Background Palette

```css
/* 5 Gradient Mesh Backgrounds - Dark Aurora Theme */

.gradient-bg-1 {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  /* Purple-Violet aurora */
}

.gradient-bg-2 {
  background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
  color: #ffffff;
  /* Green-Blue aurora */
}

.gradient-bg-3 {
  background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  color: #ffffff;
  /* Orange-Red aurora */
}

.gradient-bg-4 {
  background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
  color: #ffffff;
  /* Purple-Pink aurora */
}

.gradient-bg-5 {
  background: linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%);
  color: #ffffff;
  /* Blue-Indigo aurora (Most used) */
}
```

### Typography Colors (White-First Hierarchy)

```css
/* Text Color System */
--text-primary: #ffffff;        /* Main content, headings */
--text-secondary: #d1d5db;      /* Gray-300 - Supporting text */
--text-tertiary: #9ca3af;       /* Gray-400 - Muted text */
--text-accent-blue: #60a5fa;    /* Blue-400 - Links, accents */
--text-accent-green: #34d399;   /* Green-400 - Success */
```

**Usage Hierarchy**:
1. **Headings** → `text-white` (100% white)
2. **Body Text** → `text-gray-300` (85% opacity white)
3. **Metadata** → `text-gray-400` (70% opacity white)

### Status Colors (Optimized for Dark Backgrounds)

```css
--success: #10b981;    /* Green-500 */
--warning: #f59e0b;    /* Amber-500 */
--error: #ef4444;      /* Red-500 */
--info: #3b82f6;       /* Blue-500 */
```

---

## Glass Morphism Components

### Standard Glass (Light Glass on Dark)

```css
.glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  color: #ffffff;
}
```

**When to Use**: Content cards, panels, modals on gradient backgrounds

### Dark Glass (Extra Dark Overlay)

```css
.glass-dark {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
```

**When to Use**: Emphasis containers, featured sections

### Subtle Glass (Minimal Overlay)

```css
.glass-subtle {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
}
```

**When to Use**: Nested containers, secondary panels

---

## Typography System

### Font Families

```css
/* Primary Font Stack */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
             Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Type Scale

```css
/* Headings */
.text-5xl { font-size: 3rem; }      /* Hero titles */
.text-4xl { font-size: 2.25rem; }   /* Page titles */
.text-3xl { font-size: 1.875rem; }  /* Section titles */
.text-2xl { font-size: 1.5rem; }    /* Sub-sections */
.text-xl  { font-size: 1.25rem; }   /* Card titles */

/* Body */
.text-base { font-size: 1rem; }     /* Default body */
.text-sm   { font-size: 0.875rem; } /* Small text */
.text-xs   { font-size: 0.75rem; }  /* Captions */
```

### Font Weights

```css
.font-bold      { font-weight: 700; }  /* Headings, emphasis */
.font-semibold  { font-weight: 600; }  /* Sub-headings */
.font-medium    { font-weight: 500; }  /* Buttons, labels */
.font-normal    { font-weight: 400; }  /* Body text */
```

### Typography Examples

```tsx
// Page Hero
<h1 className="text-5xl font-bold text-white mb-4">
  Peta Prioritas AI
</h1>

// Section Title
<h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
  <TrendingUp className="w-6 h-6" />
  Statistik Per Provinsi
</h2>

// Card Title
<h3 className="font-bold text-white mb-2">
  SDN 1 Jakarta
</h3>

// Body Text
<p className="text-gray-300">
  Supporting information goes here
</p>

// Metadata
<p className="text-sm text-gray-400">
  Created: 15 Nov 2025
</p>
```

---

## Component Patterns

### Page Layout Pattern

```tsx
export default function Page() {
  return (
    <div className="min-h-screen gradient-bg-5 py-12 px-4">
      {/* Page automatically has white text */}

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">
            Page Title
          </h1>
          <p className="text-xl text-gray-200">
            Page description
          </p>
        </div>

        {/* Content Cards */}
        <div className="glass rounded-2xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">
            Section Title
          </h2>
          <p className="text-gray-300">
            Content goes here
          </p>
        </div>
      </div>
    </div>
  )
}
```

### Card Pattern

```tsx
<div className="glass rounded-xl p-6 hover:shadow-glow transition-smooth">
  {/* Header */}
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-white">Card Title</h3>
    <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-semibold">
      Status
    </span>
  </div>

  {/* Content */}
  <p className="text-gray-300 mb-4">
    Card description text
  </p>

  {/* Stats */}
  <div className="flex items-center gap-4 text-sm">
    <span className="text-gray-400">Metadata:</span>
    <span className="font-semibold text-white">Value</span>
  </div>
</div>
```

### Button Pattern

```tsx
{/* Primary Button */}
<button className="gradient-bg-4 text-white px-6 py-3 rounded-xl font-bold hover:shadow-glow transition-smooth flex items-center gap-2">
  <CheckCircle className="w-5 h-5" />
  Primary Action
</button>

{/* Secondary Button */}
<button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-smooth">
  Secondary Action
</button>

{/* Outline Button */}
<button className="border-2 border-white/30 hover:border-white/50 text-white px-6 py-3 rounded-xl font-semibold transition-smooth">
  Outline Action
</button>
```

### Stat Card Pattern

```tsx
<div className="glass-subtle rounded-xl p-5">
  {/* Icon */}
  <div className="w-12 h-12 gradient-bg-2 rounded-xl flex items-center justify-center mb-3">
    <TrendingUp className="w-6 h-6 text-white" />
  </div>

  {/* Label */}
  <p className="text-sm text-gray-300 mb-1">Total Deliveries</p>

  {/* Value */}
  <p className="text-3xl font-bold text-white mb-2">1,234</p>

  {/* Trend */}
  <p className="text-xs text-green-400 flex items-center gap-1">
    <ArrowUp className="w-3 h-3" />
    +12% dari bulan lalu
  </p>
</div>
```

---

## Icon System

### NO EMOJI - Only Lucide React SVG

**❌ NEVER Use Emoji**:
```tsx
<div>✅ Success</div>           {/* WRONG */}
<button>🔒 Lock Funds</button>  {/* WRONG */}
<h1>📊 Analytics</h1>           {/* WRONG */}
```

**✅ ALWAYS Use Lucide Icons**:
```tsx
import { CheckCircle, Lock, BarChart3 } from 'lucide-react'

<div className="flex items-center gap-2 text-white">
  <CheckCircle className="w-5 h-5" />
  Success
</div>

<button className="flex items-center gap-2">
  <Lock className="w-5 h-5" />
  Lock Funds
</button>

<h1 className="flex items-center gap-3">
  <BarChart3 className="w-8 h-8" />
  Analytics
</h1>
```

### Icon Sizes

```tsx
{/* Small - 16px */}
<Icon className="w-4 h-4" />

{/* Default - 20px */}
<Icon className="w-5 h-5" />

{/* Medium - 24px */}
<Icon className="w-6 h-6" />

{/* Large - 32px */}
<Icon className="w-8 h-8" />

{/* Extra Large - 48px */}
<Icon className="w-12 h-12" />
```

---

## Spacing System

```css
/* Tailwind Spacing Scale (4px base) */
gap-2   → 8px    /* Tight spacing */
gap-3   → 12px   /* Default spacing */
gap-4   → 16px   /* Comfortable spacing */
gap-6   → 24px   /* Section spacing */
gap-8   → 32px   /* Large spacing */

/* Padding */
p-4     → 16px   /* Card padding */
p-6     → 24px   /* Panel padding */
p-8     → 32px   /* Container padding */

/* Margin */
mb-4    → 16px   /* Between elements */
mb-6    → 24px   /* Between sections */
mb-8    → 32px   /* Between major sections */
```

---

## Shadows & Effects

### Modern Shadows

```css
/* Default Shadow */
.shadow-modern {
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2),
              0 8px 10px -6px rgba(0, 0, 0, 0.2);
}

/* Glow Effect (on hover) */
.shadow-glow {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.6);
}

/* Subtle Shadow */
.shadow-subtle {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

### Transitions

```css
/* Standard Transition */
.transition-smooth {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Fast Transition */
.transition-fast {
  transition: all 0.15s ease-in-out;
}
```

---

## Animations

### Fade In Animation

```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.5s ease-out;
}
```

### Pulse Glow Animation

```css
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(59, 130, 246, 0.4);
  }
  50% {
    box-shadow: 0 0 30px rgba(59, 130, 246, 0.8);
  }
}

.animate-pulse-glow {
  animation: pulseGlow 2s ease-in-out infinite;
}
```

---

## Smooth Scrolling System

### Overview

Platform MBG menggunakan **kombinasi multiple optimizations** untuk menciptakan scrolling experience yang sangat smooth dan responsive. Teknik-teknik ini bekerja bersama untuk memberikan user experience yang premium.

### 1. Native Smooth Scrolling (CSS)

```css
/* Global Smooth Scrolling */
html {
  scroll-behavior: smooth;
}

/* Scroll Padding for Fixed Headers */
html {
  scroll-padding-top: 80px; /* Height of fixed navbar */
}
```

**Usage**:
```tsx
// Anchor link smooth scrolling
<a href="#section-id" className="text-blue-400 hover:underline">
  Jump to Section
</a>

// Programmatic smooth scrolling
<button onClick={() => {
  document.getElementById('target')?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  })
}}>
  Scroll to Target
</button>
```

### 2. GPU Acceleration

```css
/* Force GPU Acceleration for Animations */
.gpu-accelerated {
  transform: translate3d(0, 0, 0);
  will-change: transform;
  backface-visibility: hidden;
}

/* Optimized Transform Animations */
.smooth-transform {
  transform: translate3d(0, 0, 0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

**When to Use**:
```tsx
// Animated cards or panels
<div className="transform translate-y-0 hover:-translate-y-2 transition-transform duration-300">
  Card content
</div>

// Parallax effects
<div className="will-change-transform transform translate-y-[var(--scroll-offset)]">
  Parallax content
</div>
```

### 3. Optimized Animations with Framer Motion

```tsx
import { motion, useInView, useReducedMotion } from 'framer-motion'

// Fade in animation with custom easing
const fadeInVariants = {
  hidden: {
    opacity: 0,
    y: 20
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1] // cubic-bezier
    }
  }
}

// Stagger children animation
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

// Usage example
<motion.div
  initial="hidden"
  animate="visible"
  variants={fadeInVariants}
>
  Content
</motion.div>

<motion.div
  variants={containerVariants}
  initial="hidden"
  animate="visible"
>
  {items.map((item, i) => (
    <motion.div key={i} variants={fadeInVariants}>
      {item}
    </motion.div>
  ))}
</motion.div>
```

### 4. Performance Optimizations

#### Throttling Scroll Events

```tsx
import { useEffect, useRef } from 'react'

function useThrottledScroll(callback: () => void, delay = 100) {
  const lastRun = useRef(Date.now())

  useEffect(() => {
    const handleScroll = () => {
      const now = Date.now()
      if (now - lastRun.current >= delay) {
        callback()
        lastRun.current = now
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [callback, delay])
}

// Usage
function ParallaxSection() {
  useThrottledScroll(() => {
    // Update parallax offset
  }, 16) // ~60fps

  return <div>Parallax content</div>
}
```

#### Image Preloading

```tsx
// Preload critical images
useEffect(() => {
  const preloadImages = [
    '/hero-bg.jpg',
    '/feature-1.jpg',
    '/feature-2.jpg'
  ]

  preloadImages.forEach(src => {
    const img = new Image()
    img.src = src
  })
}, [])
```

#### Lazy Loading with Intersection Observer

```tsx
import { useEffect, useRef, useState } from 'react'

function useLazyLoad() {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '50px' } // Preload 50px before visible
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return { ref, isVisible }
}

// Usage
function LazySection() {
  const { ref, isVisible } = useLazyLoad()

  return (
    <div ref={ref}>
      {isVisible && <ExpensiveComponent />}
    </div>
  )
}
```

### 5. Consistent Cubic-Bezier Timing Functions

```css
/* Design System Easing Curves */
:root {
  /* Standard easing - Most common */
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

  /* Decelerate - Entering elements */
  --ease-decelerate: cubic-bezier(0.0, 0, 0.2, 1);

  /* Accelerate - Exiting elements */
  --ease-accelerate: cubic-bezier(0.4, 0, 1, 1);

  /* Snappy - Interactive elements */
  --ease-snappy: cubic-bezier(0.4, 0, 0.6, 1);
}
```

**Usage Examples**:
```tsx
// Entering animations (decelerate)
<motion.div
  initial={{ opacity: 0, scale: 0.9 }}
  animate={{ opacity: 1, scale: 1 }}
  transition={{ duration: 0.3, ease: [0.0, 0, 0.2, 1] }}
>
  Modal content
</motion.div>

// Exiting animations (accelerate)
<motion.div
  exit={{ opacity: 0, scale: 0.9 }}
  transition={{ duration: 0.2, ease: [0.4, 0, 1, 1] }}
>
  Dismissing content
</motion.div>

// Hover effects (snappy)
<button className="transition-all duration-200 hover:scale-105"
  style={{ transitionTimingFunction: 'var(--ease-snappy)' }}>
  Interactive Button
</button>
```

### 6. Viewport-Based Triggering (useInView)

```tsx
import { motion, useInView } from 'framer-motion'
import { useRef } from 'react'

// Trigger once when in view
function AnimateOnScroll({ children }: { children: React.ReactNode }) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    once: true,           // Trigger only once
    margin: "-100px"      // Trigger 100px before entering viewport
  })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  )
}

// Multiple sections with stagger
function ScrollSections() {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <AnimateOnScroll key={i}>
          <div className="glass rounded-2xl p-6">
            {section.content}
          </div>
        </AnimateOnScroll>
      ))}
    </div>
  )
}
```

### 7. Accessibility - Reduced Motion Support

```tsx
import { useReducedMotion } from 'framer-motion'

// Respect user's motion preferences
function AccessibleAnimation({ children }: { children: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.5,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  )
}
```

**CSS Support**:
```css
/* Disable animations for users who prefer reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Complete Example - Smooth Scrolling Page

```tsx
'use client'

import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { ChevronDown } from 'lucide-react'

export default function SmoothScrollPage() {
  const shouldReduceMotion = useReducedMotion()

  // Scroll to next section
  const scrollToNext = () => {
    document.getElementById('features')?.scrollIntoView({
      behavior: 'smooth'
    })
  }

  return (
    <div className="min-h-screen gradient-bg-5">
      {/* Hero Section */}
      <section className="min-h-screen flex flex-col items-center justify-center px-4">
        <motion.h1
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.6, ease: [0.0, 0, 0.2, 1] }}
          className="text-5xl md:text-6xl font-bold text-white text-center mb-6"
        >
          Smooth Scrolling Demo
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.6, delay: 0.2, ease: [0.0, 0, 0.2, 1] }}
          className="text-xl text-gray-200 text-center mb-8"
        >
          Experience premium scrolling performance
        </motion.p>

        <motion.button
          initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.4, delay: 0.4 }}
          whileHover={{ scale: shouldReduceMotion ? 1 : 1.05 }}
          whileTap={{ scale: shouldReduceMotion ? 1 : 0.95 }}
          onClick={scrollToNext}
          className="glass px-8 py-4 rounded-xl font-semibold text-white flex items-center gap-2 hover:shadow-glow transition-smooth"
        >
          Explore Features
          <ChevronDown className="w-5 h-5 animate-bounce" />
        </motion.button>
      </section>

      {/* Features Section */}
      <section id="features" className="min-h-screen py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <h2 className="text-4xl font-bold text-white text-center mb-12">
              Premium Features
            </h2>
          </ScrollReveal>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="glass rounded-2xl p-6 transform hover:-translate-y-2 transition-transform duration-300">
                  <h3 className="text-xl font-bold text-white mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-300">
                    {feature.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// Reusable scroll reveal component
function ScrollReveal({
  children,
  delay = 0
}: {
  children: React.ReactNode
  delay?: number
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
      transition={{
        duration: shouldReduceMotion ? 0.01 : 0.5,
        delay: shouldReduceMotion ? 0 : delay,
        ease: [0.4, 0, 0.2, 1]
      }}
    >
      {children}
    </motion.div>
  )
}

const features = [
  { title: "GPU Accelerated", description: "Hardware-accelerated animations for 60fps performance" },
  { title: "Smart Throttling", description: "Optimized event handlers for smooth scrolling" },
  { title: "Accessible", description: "Respects reduced motion preferences" }
]
```

### Performance Best Practices

**✅ DO**:
1. Use `transform` and `opacity` for animations (GPU-accelerated)
2. Add `will-change` sparingly and remove after animation
3. Use `passive: true` for scroll listeners
4. Throttle/debounce scroll events
5. Implement lazy loading for heavy content
6. Respect `prefers-reduced-motion`
7. Use `intersection-observer` for viewport triggers

**❌ DON'T**:
1. Animate `width`, `height`, `top`, `left` (causes reflow)
2. Add `will-change` to everything (memory issues)
3. Use unthrottled scroll listeners
4. Load all content immediately
5. Ignore accessibility preferences
6. Use synchronous scroll handlers

### Dependencies

```json
{
  "dependencies": {
    "framer-motion": "^10.16.0"
  }
}
```

**Install**:
```bash
npm install framer-motion
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
sm: 640px   → @media (min-width: 640px)
md: 768px   → @media (min-width: 768px)
lg: 1024px  → @media (min-width: 1024px)
xl: 1280px  → @media (min-width: 1280px)
2xl: 1536px → @media (min-width: 1536px)
```

### Responsive Pattern

```tsx
<div className="
  grid
  grid-cols-1     /* Mobile: 1 column */
  md:grid-cols-2  /* Tablet: 2 columns */
  lg:grid-cols-3  /* Desktop: 3 columns */
  gap-4
">
  {/* Cards */}
</div>

<h1 className="
  text-3xl        /* Mobile: 1.875rem */
  md:text-4xl     /* Tablet: 2.25rem */
  lg:text-5xl     /* Desktop: 3rem */
  font-bold
  text-white
">
  Responsive Heading
</h1>
```

---

## Accessibility

### Color Contrast

**WCAG AA Compliance** (4.5:1 for normal text, 3:1 for large text):
- ✅ White (#FFFFFF) on gradient backgrounds → Passes
- ✅ Gray-300 (#d1d5db) on dark backgrounds → Passes
- ✅ Status colors (green, red, amber, blue) → Passes

### Focus States

```tsx
<button className="
  focus:outline-none
  focus:ring-2
  focus:ring-blue-400
  focus:ring-offset-2
  focus:ring-offset-gray-900
">
  Accessible Button
</button>

<input className="
  focus:border-blue-400
  focus:ring-2
  focus:ring-blue-400/20
" />
```

### Screen Reader Support

```tsx
{/* Icon with label */}
<button aria-label="Close modal">
  <X className="w-5 h-5" />
</button>

{/* Status indicator */}
<span className="text-green-400" role="status" aria-live="polite">
  <CheckCircle className="w-5 h-5" aria-hidden="true" />
  Verified
</span>
```

---

## Best Practices

### ✅ DO

1. **Use white text on gradient backgrounds**
   ```tsx
   <div className="gradient-bg-5">
     <h1 className="text-white">Title</h1>
   </div>
   ```

2. **Use glass components for content containers**
   ```tsx
   <div className="glass rounded-xl p-6">
     Content
   </div>
   ```

3. **Use Lucide icons consistently**
   ```tsx
   import { MapPin } from 'lucide-react'
   <MapPin className="w-5 h-5" />
   ```

4. **Maintain color hierarchy (white → gray-300 → gray-400)**
   ```tsx
   <h2 className="text-white">Title</h2>
   <p className="text-gray-300">Body</p>
   <span className="text-gray-400">Meta</span>
   ```

### ❌ DON'T

1. **Don't use dark text on gradient backgrounds**
   ```tsx
   {/* WRONG */}
   <div className="gradient-bg-5">
     <h1 className="text-gray-900">Title</h1>
   </div>
   ```

2. **Don't use emoji**
   ```tsx
   {/* WRONG */}
   <button>✅ Verify</button>
   ```

3. **Don't mix light and dark themes**
   ```tsx
   {/* WRONG - Inconsistent */}
   <div className="bg-white text-black">
     <div className="gradient-bg-5 text-white">
       Nested
     </div>
   </div>
   ```

4. **Don't use too many different colors**
   ```tsx
   {/* WRONG - Too many gradients */}
   <div className="gradient-bg-1">
     <div className="gradient-bg-2">
       <div className="gradient-bg-3">
         Messy
       </div>
     </div>
   </div>
   ```

---

## Quick Reference

### Common Class Combinations

```tsx
{/* Page Container */}
<div className="min-h-screen gradient-bg-5 py-12 px-4">

{/* Content Wrapper */}
<div className="max-w-7xl mx-auto">

{/* Card */}
<div className="glass rounded-2xl p-6 mb-6">

{/* Heading */}
<h1 className="text-4xl font-bold text-white mb-4">

{/* Body Text */}
<p className="text-gray-300">

{/* Primary Button */}
<button className="gradient-bg-4 text-white px-6 py-4 rounded-xl font-bold hover:shadow-glow transition-smooth">

{/* Secondary Button */}
<button className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold transition-smooth">

{/* Input */}
<input className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20">

{/* Badge */}
<span className="px-3 py-1 rounded-full bg-green-500/20 text-green-400 text-sm font-semibold">

{/* Icon Button */}
<button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-smooth text-white">
  <Icon className="w-5 h-5" />
</button>
```

---

## File Reference

**Main CSS File**: [frontend/app/globals.css](frontend/app/globals.css)

**Component Examples**:
- Landing Page: [frontend/app/page.tsx](frontend/app/page.tsx)
- Priority Map: [frontend/app/public/priority-map/page.tsx](frontend/app/public/priority-map/page.tsx)
- School Dashboard: [frontend/app/school/page.tsx](frontend/app/school/page.tsx)
- Admin Dashboard: [frontend/app/admin/page.tsx](frontend/app/admin/page.tsx)

---

**Design System Version**: 2.0 (Dark Mesh Aurora)
**Last Updated**: 15 November 2025
**Status**: Production Ready ✅
