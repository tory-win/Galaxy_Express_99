import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const DEMO_REQUEST_ID = 'R-DEMO-VIDEO'
const proofDir = process.env.DEMO_PROOF_DIR || '/tmp/railpool-demo-proof'

async function installDemoStorage(page, view) {
  await page.addInitScript(({ requestId, initialView }) => {
    window.localStorage.setItem('railpool:ownRequestIds', JSON.stringify([requestId]))
    window.sessionStorage.setItem('railpool:requestId', requestId)
    window.sessionStorage.setItem('railpool:view', initialView)
  }, { requestId: DEMO_REQUEST_ID, initialView: view })
}

test('demo mode freezes time and exposes deterministic pool events', async ({ page }) => {
  await mkdir(proofDir, { recursive: true })
  await installDemoStorage(page, 'pool')
  await page.goto('./?demo=1#rail-logistics')

  await expect(page.getByLabel('상태 막대').getByText('15:51', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '3TEU만 더 모이면 확정' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => Object.keys(window.__demo ?? {}).sort())).toEqual(['fire', 'reset'])

  await page.evaluate(() => window.__demo.reset())
  await page.waitForTimeout(1_100)
  await page.screenshot({ path: `${proofDir}/01-before-15teu.png` })

  await page.evaluate(() => window.__demo.fire(1))
  await page.waitForTimeout(250)
  await page.screenshot({ path: `${proofDir}/02-filling.png` })
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${proofDir}/03-filling.png` })
  await page.waitForTimeout(650)
  await page.screenshot({ path: `${proofDir}/04-after-18teu.png` })

  await expect(page.getByRole('progressbar', { name: '함께 보내기 모집 진행률' })).toHaveAttribute('aria-valuenow', '100')
  await expect(page.getByText('61만원', { exact: true })).toBeVisible()
  await expect(page.getByText('243만원', { exact: true })).toBeVisible()
  await expect(page.getByText('5건 · 전부 익명', { exact: true })).toBeVisible()

  await page.evaluate(() => window.__demo.fire(2))
  await page.waitForTimeout(1_100)
  await expect(page.getByText('3TEU만 더 모이면 확정', { exact: true })).toBeVisible()

  await page.evaluate(() => window.__demo.fire(3))
  await expect(page.getByRole('button', { name: '함께 보내기 푸시 알림 열기' })).toBeVisible()
})

test('demo request step 2 changes the method count from one to three', async ({ page }) => {
  await mkdir(proofDir, { recursive: true })
  await installDemoStorage(page, 'request')
  await page.route('**/api/v1/extract', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      fields: {
        origin: '서화성',
        destination: '부산신항',
        containerSize: '20ft',
        containerCount: 4,
        teu: 4,
        departureDate: '2026-08-18',
        deadline: '2026-08-20T09:00',
        hazardous: 'no',
        roadCost: 3120000,
        cargo: '산업용 부품',
      },
      evidence: {},
      missing: [],
      source: 'demo',
    }),
  }))
  await page.goto('./?demo=1#rail-logistics')
  await page.getByRole('button', { name: '이메일·문서' }).click()
  await page.getByRole('textbox', { name: '메일 또는 문서 내용' }).fill('서화성에서 부산신항까지 20ft 컨테이너 4개, 8월 18일 출발입니다.')
  await page.getByRole('button', { name: '조건 자동 입력' }).click()
  await page.getByRole('button', { name: '인식 결과 확인·수정' }).click()
  await page.getByRole('button', { name: '다음' }).click()

  await expect(page.getByRole('heading', { name: '어디까지 검토해볼까요?' })).toBeVisible()
  await expect(page.getByText('1가지', { exact: true })).toBeVisible()
  await page.getByText('지금 조건으로 찾을 수 있는 방법', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${proofDir}/05-methods-1.png` })
  await page.getByRole('button', { name: '±1일', exact: true }).click()
  await expect(page.getByText('3가지', { exact: true }).first()).toBeVisible()
  await page.getByText('지금 조건으로 찾을 수 있는 방법', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${proofDir}/06-methods-3.png` })
})

test('normal route does not expose demo controls', async ({ page }) => {
  await page.goto('./#rail-logistics')
  await expect.poll(() => page.evaluate(() => typeof window.__demo)).toBe('undefined')
  await expect(page.getByRole('region', { name: '함께 보내기 네트워크 현황' })).toBeVisible()
})
