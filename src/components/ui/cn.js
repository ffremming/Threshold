import clsx from 'clsx'
import { twMerge } from 'tailwind-merge'

/* className composer — resolves conflicting Tailwind utilities and
 * drops falsy values. Use everywhere we author Tailwind classes. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
