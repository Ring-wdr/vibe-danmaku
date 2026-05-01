import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const styleSheet = readFileSync('src/style.css', 'utf8')

function blockFor(selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styleSheet.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`))

  return match?.groups?.body ?? ''
}

describe('menu layout CSS', () => {
  it('keeps menu chrome viewport-bound while letting each menu screen scroll internally', () => {
    expect(blockFor('.app-shell')).toContain('height: 100dvh')
    expect(blockFor('.app-shell__phone-frame')).toContain(
      'height: min(var(--shell-frame-height), 932px)',
    )
    expect(blockFor('.screen-stack')).toContain('height: 100%')
    expect(blockFor('.screen')).toContain('overflow-y: auto')
  })

  it('keeps the title screen from showing a scrollbar', () => {
    expect(blockFor('.screen--hero')).toContain('overflow-y: hidden')
  })
})
