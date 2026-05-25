/* ────────────────────────────────────────────────────────────────────
 * Motion variants — shared across screens for consistent choreography.
 * Use with framer-motion's <motion.* /> components.
 *
 * Easing: cubic-bezier(0.16, 1, 0.3, 1) — matches design system spec.
 * Entrance: fade + 28px lift over 700ms.
 * ──────────────────────────────────────────────────────────────────── */

export const easeOut = [0.16, 1, 0.3, 1]

export const fadeIn = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.7, ease: easeOut } },
}

export const fadeInUp = {
  hidden:  { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: easeOut } },
}

export const fadeInDown = {
  hidden:  { opacity: 0, y: -16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: easeOut } },
}

export const fadeInScale = {
  hidden:  { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.7, ease: easeOut } },
}

/* Container that staggers its direct children */
export const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.1 } },
}

export const staggerFast = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

/* Standard viewport options for scroll-triggered reveals */
export const viewport = { once: true, amount: 0.15, margin: '-60px' }

/* Continuous float animation (use with motion.div animate prop) */
export const floatY = {
  y: [0, -10, 0],
  transition: { duration: 5, ease: 'easeInOut', repeat: Infinity },
}

export const floatYAlt = {
  y: [0, 10, 0],
  transition: { duration: 4, ease: 'easeInOut', repeat: Infinity },
}
