import { expect, test } from '@playwright/test'
import { MANUAL_ENTRIES, MANUAL_ENTRY_COUNT } from '../../src/manual/manualContent.js'

const EXPECTED_CONTEXTS = [
  'home',
  'mobility',
  'travel',
  'tickets',
  'menu',
  'benefits',
  'rail-dashboard',
  'rail-request',
  'rail-proposals',
  'rail-compare',
  'rail-pool',
  'rail-disruption',
  'rail-review',
]

test('manual catalog covers every user-facing screen with detailed guidance', () => {
  expect(MANUAL_ENTRY_COUNT).toBe(EXPECTED_CONTEXTS.length)
  expect(Object.keys(MANUAL_ENTRIES)).toEqual(EXPECTED_CONTEXTS)

  for (const context of EXPECTED_CONTEXTS) {
    const entry = MANUAL_ENTRIES[context]
    expect(entry.summary.length, `${context} summary`).toBeGreaterThan(40)
    expect(entry.focus.length, `${context} focus`).toBeGreaterThanOrEqual(3)
    expect(entry.steps.length, `${context} steps`).toBeGreaterThanOrEqual(4)
    expect(entry.controls.length, `${context} controls`).toBeGreaterThanOrEqual(4)
    expect(entry.states.length, `${context} states`).toBeGreaterThanOrEqual(3)
    expect(entry.terms.length, `${context} terms`).toBeGreaterThanOrEqual(2)
    expect(entry.warning.body.length, `${context} warning`).toBeGreaterThan(30)
    expect(entry.next.body.length, `${context} next action`).toBeGreaterThan(20)
  }
})

test.describe('desktop contextual manual', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('stays beside the phone and follows the active app screen', async ({ page }) => {
    await page.goto('./#rail-logistics')

    const panel = page.locator('.gx-manual-panel')
    await expect(panel).toBeVisible()
    await expect(page.getByRole('complementary', { name: '내 운송 · 매칭 현황' })).toBeVisible()
    await expect(panel).toHaveAttribute('data-manual-context', 'rail-dashboard')
    await expect(panel.getByRole('heading', { name: '사용 순서' })).toBeVisible()
    await expect(panel.getByText('RAILPOOL AI가 몇 곳의 화주 조건을 비교 중인지 확인합니다.')).toBeVisible()

    const layout = await page.evaluate(() => {
      const phone = document.querySelector('.kr-phone-stage').getBoundingClientRect()
      const manual = document.querySelector('.gx-manual-panel').getBoundingClientRect()
      return {
        phoneRight: phone.right,
        manualLeft: manual.left,
        heightDifference: Math.abs(phone.height - manual.height),
        documentOverflow: document.documentElement.scrollWidth - window.innerWidth,
      }
    })
    expect(layout.manualLeft - layout.phoneRight).toBeGreaterThanOrEqual(24)
    expect(layout.heightDifference).toBeLessThanOrEqual(1)
    expect(layout.documentOverflow).toBeLessThanOrEqual(0)

    const manualScroll = panel.locator('.gx-manual-scroll')
    await manualScroll.evaluate((element) => element.scrollTo({ top: 600 }))
    await page.locator('.rp-create-request-link').click()
    await expect(panel).toHaveAttribute('data-manual-context', 'rail-request')
    await expect(panel.getByRole('heading', { name: 'AI 운송 요청 · 3단계 입력' })).toBeVisible()
    await expect(panel.getByText('전화·음성, 직접 선택, 이메일·문서 중 편한 입력 방식을 사용합니다.')).toBeVisible()
    await expect.poll(() => manualScroll.evaluate((element) => element.scrollTop)).toBe(0)

    await page.getByRole('button', { name: '이전 화면으로 돌아가기' }).click()
    await expect(panel).toHaveAttribute('data-manual-context', 'rail-dashboard')
    await page.getByRole('button', { name: '이전 화면으로 돌아가기' }).click()
    await expect(panel).toHaveAttribute('data-manual-context', 'home')
    await expect(panel.getByRole('heading', { name: '홈 · 서비스 시작' })).toBeVisible()
  })
})

test.describe('mobile contextual manual', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('opens as a focus-safe sheet without widening the app', async ({ page }) => {
    await page.goto('./#rail-logistics')

    const launch = page.getByRole('button', { name: /현재 화면 사용 매뉴얼 열기/ })
    const panel = page.locator('.gx-manual-panel')
    await expect(launch).toBeVisible()
    await expect(panel).not.toBeVisible()

    await launch.click()
    const dialog = page.getByRole('dialog', { name: '내 운송 · 매칭 현황' })
    await expect(dialog).toBeVisible()
    await expect(page.getByRole('button', { name: '사용 매뉴얼 닫기' })).toBeFocused()
    await expect.poll(() => page.locator('.kr-phone-stage').evaluate((element) => element.inert)).toBe(true)

    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: '사용 매뉴얼 닫기' })).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
    await expect(launch).toBeFocused()
    await expect.poll(() => page.locator('.kr-phone-stage').evaluate((element) => element.inert)).toBe(false)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
