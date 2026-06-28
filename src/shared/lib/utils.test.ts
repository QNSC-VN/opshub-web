import { describe, expect, it } from 'vitest'
import { cn } from './utils'

// Smoke test that establishes the Vitest harness for opshub-web.
// Use this as a template for component/unit tests (Testing Library is set up
// in src/test/setup.ts).
describe('cn', () => {
  it('joins truthy class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('ignores falsy values', () => {
    expect(cn('a', false, undefined, null, 'b')).toBe('a b')
  })

  it('de-duplicates conflicting Tailwind utilities (last wins)', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })
})
