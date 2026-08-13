import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

async function capture(page, name) {
  if (!process.env.CAPTURE_DIR) return
  await mkdir(process.env.CAPTURE_DIR, { recursive: true })
  await page.screenshot({ path: path.join(process.env.CAPTURE_DIR, `${name}.png`) })
}

test('Korail entry opens the complete Rail Logistics demo flow', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: '레일물류' })).toBeVisible()
  await capture(page, '01-korail-entry')

  await page.getByRole('button', { name: '레일물류' }).click()
  await expect(page.getByRole('heading', { name: /철도가 유리해지는 조건/ })).toBeVisible()
  await expect(page).toHaveURL(/#rail-logistics$/)
  await capture(page, '02-railpool-dashboard')

  await page.getByRole('button', { name: /새 화물 보내기/ }).first().click()
  await page.getByRole('button', { name: '시연용 메일 불러오기' }).click()
  await page.getByRole('button', { name: 'AI로 조건 자동 인식' }).click()
  await expect(page.getByText('6개 필수 항목을 인식했습니다')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: '인식 결과 확인·수정' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('heading', { name: '어디까지 검토해볼까요?' })).toBeVisible()
  await page.getByRole('button', { name: '±2일' }).click()
  await expect(page.getByText('4가지', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '다음' }).click()
  await expect(page.getByRole('heading', { name: '이 조건으로 방법을 찾을게요' })).toBeVisible()

  await page.getByRole('button', { name: 'AI에게 방법 물어보기' }).click()
  await expect(page.getByText('출발일을 하루만 옮기시면', { exact: false }).first()).toBeVisible()
  await expect(page.getByText('화차 채움 최적화', { exact: true })).toBeVisible()
  await capture(page, '03-ai-counterproposal')

  await page.getByRole('button', { name: '이 안을 기준으로 비교' }).first().click()
  await expect(page.getByRole('table', { name: '내 원래 계획과 제안 비교' })).toBeVisible()
  await expect(page.getByRole('rowheader', { name: '전환교통 지원사업' })).toBeVisible()
  await page.getByRole('button', { name: '돌아가기', exact: true }).click()

  await page.getByRole('button', { name: '이 제안으로 진행' }).first().click()
  await expect(page.getByRole('heading', { name: '3TEU만 더 모이면 확정' })).toBeVisible()
  await page.getByRole('button', { name: /B사 3TEU 등록 시연/ }).click()
  await expect(page.getByRole('heading', { name: '목표 물량을 채웠어요' })).toBeVisible()
  await expect(page.getByText('32,500원 더 낮아짐')).toBeVisible()
  await capture(page, '04-pool-target-reached')

  await page.getByRole('button', { name: '코레일에 검토 요청 보내기' }).click()
  await expect(page.getByText('이 단계는 예약이 아닙니다', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '검토 요청 보내기' }).click()
  await expect(page.getByRole('heading', { name: '검토 요청이 전달되었습니다' })).toBeVisible()
  await capture(page, '05-review-submitted')
})

test('refresh keeps the Rail Logistics context instead of resetting to Korail home', async ({ page }) => {
  await page.goto('./#rail-logistics')
  await expect(page.getByRole('heading', { name: /철도가 유리해지는 조건/ })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: /철도가 유리해지는 조건/ })).toBeVisible()
  await expect(page).toHaveURL(/#rail-logistics$/)
})
