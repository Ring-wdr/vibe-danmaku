import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const appStyles = readFileSync('src/app/App.module.css', 'utf8')
const titleStyles = readFileSync('src/app/screens/TitleScreen.module.css', 'utf8')
const difficultyStyles = readFileSync('src/app/screens/DifficultySelectScreen.module.css', 'utf8')
const characterStyles = readFileSync('src/app/screens/CharacterSelectScreen.module.css', 'utf8')
const stageIntroStyles = readFileSync('src/app/screens/StageIntroScreen.module.css', 'utf8')

function blockFor(styleSheet: string, selector: string) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = styleSheet.match(new RegExp(`${escapedSelector}\\s*\\{(?<body>[^}]*)\\}`))

  return match?.groups?.body ?? ''
}

describe('menu layout CSS', () => {
  it('keeps menu chrome viewport-bound while letting each menu screen own its scroll area', () => {
    expect(blockFor(appStyles, '.shell')).toContain('height: 100dvh')
    expect(blockFor(appStyles, '.phoneFrame')).toContain(
      'height: min(var(--shell-frame-height), 932px)',
    )
    expect(blockFor(appStyles, '.screenStack')).toContain('height: 100%')
    expect(blockFor(difficultyStyles, '.screen')).toContain('overflow-y: auto')
    expect(blockFor(characterStyles, '.screen')).toContain('overflow-y: auto')
  })

  it('keeps the title screen from showing a scrollbar', () => {
    expect(blockFor(titleStyles, '.screen')).toContain('overflow-y: hidden')
  })

  it('keeps menu content close to the top after removing the menu header', () => {
    expect(blockFor(appStyles, '.topBar')).toBe('')
    expect(blockFor(titleStyles, '.screen')).toContain('padding: 34px 22px 26px')
    expect(blockFor(difficultyStyles, '.screen')).toContain('padding: 34px 22px 26px')
    expect(blockFor(characterStyles, '.screen')).toContain('padding: 34px 22px 26px')
  })

  it('places menu decisions in the lower thumb zone on tall mobile screens', () => {
    expect(blockFor(titleStyles, '.startButton')).toContain('margin-top: auto')
    expect(blockFor(titleStyles, '.startButton')).toContain(
      'margin-bottom: var(--thumb-zone-lift)',
    )
    expect(blockFor(characterStyles, '.deployButton')).toContain('margin-top: auto')
    expect(blockFor(characterStyles, '.deployButton')).toContain(
      'margin-bottom: var(--thumb-zone-lift)',
    )
    expect(blockFor(difficultyStyles, '.grid')).toContain('margin-top: auto')
    expect(blockFor(stageIntroStyles, '.actionZone')).toContain('margin-top: auto')
  })
})
