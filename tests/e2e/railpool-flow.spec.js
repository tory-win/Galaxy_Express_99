import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

async function capture(page, name) {
  if (!process.env.CAPTURE_DIR) return
  await mkdir(process.env.CAPTURE_DIR, { recursive: true })
  await page.screenshot({ path: path.join(process.env.CAPTURE_DIR, `${name}.png`) })
}

async function expectUsableLayout(page) {
  const audit = await page.evaluate(() => {
    const visible = (element) => {
      const style = getComputedStyle(element)
      const rect = element.getBoundingClientRect()
      return style.visibility !== 'hidden' && style.display !== 'none' && rect.width > 0 && rect.height > 0
    }
    const smallTargets = [...document.querySelectorAll('.rp-app button')]
      .filter(visible)
      .map((element) => {
        const rect = element.getBoundingClientRect()
        return { name: element.textContent.trim(), width: rect.width, height: rect.height }
      })
      .filter(({ width, height }) => width < 24 || height < 24)
    const tinyText = [...document.querySelectorAll('.rp-screen-body *')]
      .filter((element) => visible(element) && element.children.length === 0 && element.textContent.trim())
      .filter((element) => Number.parseFloat(getComputedStyle(element).fontSize) < 8)
      .map((element) => element.textContent.trim())
    const body = document.querySelector('.rp-screen-body')
    return { overflow: body.scrollWidth - body.clientWidth, smallTargets, tinyText }
  })

  expect(audit.overflow).toBeLessThanOrEqual(0)
  expect(audit.smallTargets).toEqual([])
  expect(audit.tinyText).toEqual([])
}

test('Korail entry opens the complete live Rail Logistics flow', async ({ page }) => {
  test.setTimeout(90_000)
  let createdRequestId = ''
  await page.goto('./')
  await expect(page.getByRole('button', { name: '레일물류' })).toBeVisible()
  await capture(page, '01-korail-entry')

  await page.getByRole('button', { name: '레일물류' }).click()
  await expect(page.getByRole('region', { name: '함께 보내기 네트워크 현황' })).toBeVisible()
  await expect(page.getByText(/화물 조건을 등록하고/)).toHaveCount(0)
  await expect(page.getByRole('button', { name: '녹음 시작' })).toHaveCount(0)
  await expect(page.getByText('10/10', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { name: /내 운송 요청 \d+건/ })).toBeVisible()
  await expect(page.getByRole('region', { name: '내 운송 친환경 포인트' })).toContainText('예상 포인트')
  await expect(page.getByRole('region', { name: '내 운송 친환경 포인트' })).toContainText('1kg 절감 = 1P')
  const requestFilters = page.getByRole('group', { name: '내 운송 요청 상황별 필터' })
  await expect(requestFilters.getByRole('button')).toHaveCount(5)
  await requestFilters.getByRole('button', { name: /함께 보내기/ }).click()
  await expect(requestFilters.getByRole('button', { name: /함께 보내기/ })).toHaveAttribute('aria-pressed', 'true')
  await requestFilters.getByRole('button', { name: /전체/ }).click()
  await expect(page.getByText(/공공데이터 \d+종 실시간 연결/)).toHaveCount(0)
  await expect(page.getByText('확정 자료와 가상 물량을 구분해 표시하는 시연 환경')).toHaveCount(0)
  await expect(page).toHaveURL(/#rail-logistics$/)
  await expectUsableLayout(page)
  await capture(page, '02-railpool-dashboard')

  await page.getByRole('button', { name: '새로운 운송 요청' }).click()
  await expect(page.locator('.rp-form-actions')).toHaveCount(0)
  await page.getByRole('button', { name: '이메일·문서' }).click()
  await page.getByRole('button', { name: '예시 메일 불러오기' }).click()
  await page.getByRole('button', { name: '조건 자동 입력' }).click()
  await expect(page.getByText('6개 필수 항목을 인식했습니다')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: '인식 결과 확인·수정' }).click()
  await expect.poll(() => page.locator('.rp-screen-body').evaluate((element) => element.scrollTop)).toBe(0)
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('heading', { name: '어디까지 검토해볼까요?' })).toBeVisible()
  await expect.poll(() => page.locator('.rp-screen-body').evaluate((element) => element.scrollTop)).toBe(0)
  await page.getByRole('button', { name: '±2일' }).click()
  await expect(page.getByText('4가지', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('heading', { name: '이 조건으로 방법을 찾을게요' })).toBeVisible()

  await page.getByRole('button', { name: '운송 방법 찾기' }).click()
  await expect(page.getByText(/현재 계획보다/).first()).toBeVisible()
  createdRequestId = await page.evaluate(() => window.sessionStorage.getItem('railpool:requestId'))
  await expect(page.getByText(/KORAIL·ODCloud 공공데이터/)).toHaveCount(0)
  await expect(page.getByText('화차 채움 최적화', { exact: true })).toBeVisible()
  await expectUsableLayout(page)
  await capture(page, '03-transport-proposals')

  const rejectButton = page.getByRole('button', { name: '거절하고 다른 제안 보기' }).first()
  await rejectButton.focus()
  await rejectButton.press('Enter')
  const rejectionDialog = page.getByRole('dialog', { name: '어떤 조건을 바꾸기 힘드신가요?' })
  await expect(rejectionDialog).toBeVisible()
  await expect(page.getByRole('button', { name: '거절 사유 선택 닫기' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(rejectionDialog).toBeHidden()
  await expect(rejectButton).toBeFocused()

  await page.getByRole('button', { name: '원래 계획과 상세 비교' }).first().click()
  await expect(page.getByRole('table', { name: '내 원래 계획과 제안 비교' })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: '전환교통 지원사업' })).toBeVisible()
  await page.getByRole('button', { name: '돌아가기', exact: true }).click()

  await page.getByRole('button', { name: '추천안 적용하기' }).first().click()
  await expect(page.getByText(/곳에서 실시간 확인 중/)).toBeVisible()
  await expect(page.getByRole('heading', { name: '목표 물량을 채웠어요' })).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('.rp-participant-list article')).toHaveCount(5)
  await expectUsableLayout(page)
  await capture(page, '04-pool-target-reached')

  await page.reload()
  await expect(page.getByRole('heading', { name: '목표 물량을 채웠어요' })).toBeVisible({ timeout: 15_000 })
  await expect(page).toHaveURL(/#rail-logistics$/)

  await page.getByRole('button', { name: '코레일에 검토 요청 보내기' }).click()
  await expect(page.getByText('이 단계는 예약이 아닙니다', { exact: true })).toBeVisible()
  await expectUsableLayout(page)
  await page.getByRole('button', { name: '검토 요청 보내기' }).click()
  await expect(page.getByRole('heading', { name: '검토 요청이 전달되었습니다' })).toBeVisible()
  await expect(page.getByText('확인 결과도 푸시로 알려드려요')).toBeVisible()
  await capture(page, '05-review-submitted')

  expect(createdRequestId).toMatch(/^R-2026-/)
})

test('refresh keeps the Rail Logistics context instead of resetting to Korail home', async ({ page }) => {
  await page.goto('./#rail-logistics')
  await expect(page.getByRole('region', { name: '함께 보내기 네트워크 현황' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('region', { name: '함께 보내기 네트워크 현황' })).toBeVisible()
  await expect(page).toHaveURL(/#rail-logistics$/)
})

test('request method order and searchable public-data stations are keyboard usable', async ({ page }) => {
  await page.goto('./#rail-logistics')
  await page.getByRole('button', { name: '새로운 운송 요청' }).click()

  const methods = page.locator('.rp-segmented button')
  await expect(methods).toHaveCount(3)
  await expect(page.getByRole('button', { name: '전화·음성' })).toBeVisible()
  await page.getByRole('button', { name: '조건 선택' }).click()

  const origin = page.getByRole('combobox', { name: /출발지/ })
  await origin.fill('부산신항역')
  await expect(page.getByRole('option', { name: /부산신항역/ })).toBeVisible()
  await origin.press('ArrowDown')
  await origin.press('Enter')
  await expect(origin).toHaveValue('부산신항')
  await expect(page.getByText(/공공데이터포털 · 한국철도공사 화물역 데이터/).first()).toBeVisible()
})

test('320px layout keeps readable spacing without overflow or undersized controls', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 })
  await page.goto('./')
  await page.getByRole('button', { name: '레일물류' }).click()
  await expect(page.getByRole('region', { name: '함께 보내기 네트워크 현황' })).toBeVisible()
  await expectUsableLayout(page)

  const gap = await page.evaluate(() => {
    const network = document.querySelector('.rp-network-card').getBoundingClientRect()
    const heading = document.querySelector('.rp-dashboard .rp-section-heading').getBoundingClientRect()
    return heading.top - network.bottom
  })
  expect(gap).toBeGreaterThanOrEqual(16)
})
