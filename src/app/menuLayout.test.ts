import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const appStyles = readFileSync('src/app/App.module.css', 'utf8')
const titleStyles = readFileSync('src/app/screens/TitleScreen.module.css', 'utf8')
const difficultyStyles = readFileSync('src/app/screens/DifficultySelectScreen.module.css', 'utf8')
const characterStyles = readFileSync('src/app/screens/CharacterSelectScreen.module.css', 'utf8')
const stageIntroStyles = readFileSync('src/app/screens/StageIntroScreen.module.css', 'utf8')
const settingsFormStyles = readFileSync('src/game/ui/BattleView.module.css', 'utf8')
const resultStyles = readFileSync('src/app/screens/ResultScreen.module.css', 'utf8')
const leaderboardStyles = readFileSync('src/app/screens/LeaderboardScreen.module.css', 'utf8')

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
    expect(blockFor(characterStyles, '.rosterPane')).toContain('overflow-y: auto')
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
    expect(blockFor(titleStyles, '.actions')).toContain('margin-top: auto')
    expect(blockFor(titleStyles, '.actions')).toContain(
      'margin-bottom: var(--thumb-zone-lift)',
    )
    expect(blockFor(characterStyles, '.deployButton')).toContain('margin-top: auto')
    expect(blockFor(characterStyles, '.deployButton')).toContain(
      'margin-bottom: var(--thumb-zone-lift)',
    )
    expect(blockFor(difficultyStyles, '.grid')).toContain('margin-top: auto')
    expect(blockFor(stageIntroStyles, '.actionZone')).toContain('margin-top: auto')
  })

  it('simplifies character select into a fixed preview, scrollable roster, and bottom deploy dock', () => {
    expect(blockFor(characterStyles, '.screen')).toContain('overflow: hidden')
    expect(blockFor(characterStyles, '.topBar')).toContain('grid-template-columns: auto 1fr')
    expect(blockFor(characterStyles, '.focus')).toContain('position: relative')
    expect(blockFor(characterStyles, '.heroPortrait')).toContain('opacity: 0.34')
    expect(blockFor(characterStyles, '.heroPortrait')).toContain('mask-image')
    expect(blockFor(characterStyles, '.rosterPane')).toContain('overflow-y: auto')
    expect(blockFor(characterStyles, '.deployButton')).toContain('position: sticky')
    expect(blockFor(characterStyles, '.deployButton')).toContain('bottom: 0')
  })

  it('reserves two lines for character names to prevent roster layout shift', () => {
    const slotName = blockFor(characterStyles, '.slotName')

    expect(slotName).toContain('min-height: 2.4em')
    expect(slotName).toContain('line-height: 1.2')
    expect(slotName).toContain('-webkit-line-clamp: 2')
    expect(slotName).toContain('white-space: normal')
    expect(slotName).toContain('overflow-wrap: anywhere')
  })

  it('reserves two lines for the selected character name to prevent preview layout shift', () => {
    const selectedName = blockFor(characterStyles, '.name')

    expect(selectedName).toContain('min-height: 1.92em')
    expect(selectedName).toContain('-webkit-line-clamp: 2')
    expect(selectedName).toContain('white-space: normal')
    expect(selectedName).toContain('overflow-wrap: anywhere')
  })

  it('lets the selected character name extend over the portrait area', () => {
    expect(blockFor(characterStyles, '.summary')).toContain('max-width: 76%')
  })

  it('renders roster character items as image-forward cards with a readable name overlay', () => {
    const slot = blockFor(characterStyles, '.slot')
    const slotPortrait = blockFor(characterStyles, '.slotPortrait')
    const slotName = blockFor(characterStyles, '.slotName')

    expect(slot).toContain('position: relative')
    expect(slot).toContain('overflow: hidden')
    expect(slot).toContain('padding: 0')
    expect(slotPortrait).toContain('position: absolute')
    expect(slotPortrait).toContain('width: calc(100% - 16px)')
    expect(slotPortrait).toContain('height: calc(100% - 4px)')
    expect(slotPortrait).toContain('bottom: 0')
    expect(slotPortrait).toContain('transform: scale(1.28)')
    expect(slotName).toContain('position: absolute')
    expect(slotName).toContain('bottom: 0')
    expect(slotName).toContain('linear-gradient(180deg')
    expect(slotName).toContain('rgba(5, 9, 17, 0.3)')
  })

  it('keeps settings and stage-clear buttons docked to the bottom of their screens', () => {
    expect(blockFor(settingsFormStyles, '.settingsActions')).toContain('margin-top: auto')
    expect(blockFor(settingsFormStyles, '.settingsActions')).toContain('position: sticky')
    expect(blockFor(settingsFormStyles, '.settingsActions')).toContain('bottom: 0')
    expect(blockFor(resultStyles, '.actions')).toContain('margin-top: auto')
    expect(blockFor(resultStyles, '.actions')).toContain(
      'margin-bottom: var(--thumb-zone-lift)',
    )
    expect(blockFor(resultStyles, '.actions')).toContain('position: sticky')
    expect(blockFor(resultStyles, '.actions')).toContain('bottom: 0')
  })

  it('keeps leaderboard chrome fixed while only the record list scrolls', () => {
    expect(blockFor(leaderboardStyles, '.screen')).toContain('overflow: hidden')
    expect(blockFor(leaderboardStyles, '.list')).toContain('min-height: 0')
    expect(blockFor(leaderboardStyles, '.list')).toContain('overflow-y: auto')
    expect(blockFor(leaderboardStyles, '.list')).toContain('align-content: start')
  })
})
