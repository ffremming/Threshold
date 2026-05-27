import { forwardRef } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './cn'

/* ────────────────────────────────────────────────────────────────────
 * Signature elements — the bold detail that makes the design system
 * recognizable. Generic, used across pilot and future screens.
 * ──────────────────────────────────────────────────────────────────── */

/* ── GradientText ─────────────────────────────────────────────────
 * Applies the Electric Blue gradient as text fill via background-clip.
 * Use on one or two key words inside a headline. */
export const GradientText = forwardRef(function GradientText(
  { as: Tag = 'span', className, children, ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={cn('th-gradient-text', className)} {...rest}>
      {children}
    </Tag>
  )
})

/* ── SectionLabel ────────────────────────────────────────────────
 * Pill with a (optionally pulsing) accent dot + uppercase mono caption.
 * Sits above every section headline to create vertical rhythm. */
const sectionLabelStyles = cva('th-section-label', {
  variants: {
    tone: {
      accent: '',
      muted:
        '!border-[color:var(--th-line-strong)] !bg-[color:var(--th-surface-2)] !text-[color:var(--th-ink-muted)]',
    },
  },
  defaultVariants: { tone: 'accent' },
})

export const SectionLabel = forwardRef(function SectionLabel(
  { tone, pulse = true, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} className={cn(sectionLabelStyles({ tone }), className)} {...rest}>
      <span
        className={cn(
          'th-section-label-dot',
          !pulse && '!animate-none',
          tone === 'muted' && '!bg-[color:var(--th-ink-muted)]',
        )}
        aria-hidden="true"
      />
      {children}
    </span>
  )
})

/* ── InvertedSection ─────────────────────────────────────────────
 * Deep slate background with dot-pattern texture. Wraps any content
 * that deserves dramatic spotlight (stats, final CTA, brand reveal). */
export const InvertedSection = forwardRef(function InvertedSection(
  { as: Tag = 'section', className, children, ...rest },
  ref,
) {
  return (
    <Tag ref={ref} className={cn('th-inverted', className)} {...rest}>
      {children}
    </Tag>
  )
})
