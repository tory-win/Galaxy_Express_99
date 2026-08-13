import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const BASE_URL = process.env.DEMO_BASE_URL || 'https://macmini.tailbba978.ts.net/galaxy-express/preview/'
const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg'
const REQUEST_ID = 'R-DEMO-VIDEO'
const SHOT_SECONDS = [12, 18, 20, 15, 40, 30, 20, 15, 10]
const TRANSCRIPT = '서화성에서 부산신항까지 20피트 컨테이너 4개를 8월 18일에 보내고, 8월 20일 오전 9시까지 도착해야 합니다. 위험물은 아니고 현재 도로 운송비는 312만원입니다.'
const EXTRACTED_FIELDS = {
  origin: '서화성',
  destination: '부산신항',
  containerSize: '20ft',
  containerCount: 4,
  teu: 4,
  departureDate: '2026-08-18',
  deadline: '2026-08-20T09:00',
  hazardous: 'no',
  roadCost: 3120000,
  weightTons: 12,
  cargo: '산업용 부품',
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

function demoUrl(hash = '') {
  const url = new URL(BASE_URL)
  url.searchParams.set('demo', '1')
  url.hash = hash
  return url.toString()
}

async function installRecordingState(context, initialView) {
  await context.addInitScript(({ requestId, view, transcript }) => {
    try {
      if (!window.sessionStorage.getItem('railpool:recording-initialized')) {
        window.localStorage.clear()
        window.sessionStorage.clear()
        window.localStorage.setItem('railpool:ownRequestIds', JSON.stringify([requestId]))
        window.sessionStorage.setItem('railpool:requestId', requestId)
        window.sessionStorage.setItem('railpool:view', view)
        window.sessionStorage.setItem('railpool:recording-initialized', '1')
      }
    } catch {
      // Storage is unavailable on the initial about:blank document and becomes
      // available when the app origin loads.
    }

    class DemoSpeechRecognition {
      constructor() {
        this.lang = 'ko-KR'
        this.continuous = true
        this.interimResults = true
        this.timer = 0
      }

      start() {
        this.onstart?.()
        this.timer = window.setTimeout(() => {
          const result = { 0: { transcript, confidence: 0.99 }, length: 1, isFinal: true }
          const results = { 0: result, length: 1, item: (index) => results[index] }
          this.onresult?.({ resultIndex: 0, results })
        }, 900)
      }

      stop() {
        window.clearTimeout(this.timer)
        this.onend?.()
      }

      abort() {
        window.clearTimeout(this.timer)
        this.onend?.()
      }
    }

    window.SpeechRecognition = DemoSpeechRecognition
    window.webkitSpeechRecognition = DemoSpeechRecognition
  }, { requestId: REQUEST_ID, view: initialView, transcript: TRANSCRIPT })
}

async function stubExtraction(page) {
  await page.route('**/api/v1/extract', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ fields: EXTRACTED_FIELDS, evidence: {}, missing: [], source: 'demo' }),
  }))
}

async function scrollTo(locator, waitAfter = 900) {
  await locator.evaluate((element) => element.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  await sleep(waitAfter)
}

async function openDemo(page, hash = '#rail-logistics') {
  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(demoUrl(hash), { waitUntil: 'domcontentloaded', timeout: 60_000 })
      return
    } catch (error) {
      lastError = error
      if (attempt < 3) await sleep(1_500 * attempt)
    }
  }
  throw lastError
}

async function preparePool(page, filled = false) {
  await openDemo(page)
  await page.getByRole('heading', { name: '3TEU만 더 모이면 확정' }).waitFor({ timeout: 20_000 })
  await page.evaluate(() => window.__demo.reset())
  await sleep(1_150)
  if (filled) {
    await page.evaluate(() => window.__demo.fire(1))
    await sleep(1_250)
  }
}

async function prepareStepTwo(page) {
  await stubExtraction(page)
  await openDemo(page)
  await page.getByRole('heading', { name: '보내실 화물을 알려주세요' }).waitFor({ timeout: 20_000 })
  await page.getByRole('button', { name: '이메일·문서' }).click()
  await page.getByRole('textbox', { name: '메일 또는 문서 내용' }).fill(TRANSCRIPT)
  await page.getByRole('button', { name: 'AI로 조건 자동 입력' }).click()
  await page.getByRole('button', { name: '인식 결과 확인·수정' }).click()
  await page.getByRole('button', { name: '다음' }).click()
  await page.getByRole('heading', { name: '어디까지 검토해볼까요?' }).waitFor()
  await scrollTo(page.getByText('지금 조건으로 찾을 수 있는 방법', { exact: true }), 400)
}

function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit' })
}

async function recordShot(browser, workDir, shotNumber, initialView, prepare, perform) {
  const rawDir = path.join(workDir, 'raw')
  await mkdir(rawDir, { recursive: true })
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'ko-KR',
    timezoneId: 'Asia/Seoul',
    recordVideo: { dir: rawDir, size: { width: 1920, height: 1080 } },
  })
  await installRecordingState(context, initialView)
  const pageCreatedAt = Date.now()
  const page = await context.newPage()
  const video = page.video()
  const browserMessages = []
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) browserMessages.push(`${message.type()}: ${message.text()}`)
  })
  page.on('pageerror', (error) => browserMessages.push(`pageerror: ${error.message}`))

  try {
    await prepare(page)
    await sleep(700)
    const captureOffset = (Date.now() - pageCreatedAt) / 1_000
    const startedAt = Date.now()
    await perform(page, workDir)
    const remaining = (SHOT_SECONDS[shotNumber - 1] * 1_000) - (Date.now() - startedAt)
    if (remaining > 0) await sleep(remaining)
    await sleep(1_000)
    await page.close()
    const rawPath = await video.path()
    await context.close()
    return { shotNumber, rawPath, captureOffset: Math.max(0, captureOffset - 0.15), browserMessages }
  } catch (error) {
    await page.screenshot({ path: path.join(workDir, `shot-${shotNumber}-failure.png`) }).catch(() => {})
    await context.close().catch(() => {})
    throw error
  }
}

const shotDefinitions = [
  {
    view: 'pool',
    prepare: (page) => preparePool(page, false),
    perform: async (page, workDir) => {
      await sleep(2_000)
      await page.evaluate(() => window.__demo.fire(1))
      await sleep(1_400)
      await page.screenshot({ path: path.join(workDir, 'still-01-pool-filled.png') })
    },
  },
  {
    view: 'dashboard',
    prepare: async (page) => {
      await openDemo(page, '')
      await page.getByRole('button', { name: '레일물류' }).waitFor({ timeout: 20_000 })
    },
    perform: async (page, workDir) => {
      await sleep(7_000)
      await page.getByRole('button', { name: '레일물류' }).click()
      await page.getByRole('region', { name: '함께 보내기 네트워크 현황' }).waitFor()
      await page.screenshot({ path: path.join(workDir, 'still-02-rail-home.png') })
    },
  },
  {
    view: 'dashboard',
    prepare: async (page) => {
      await stubExtraction(page)
      await openDemo(page)
      await page.getByRole('region', { name: '함께 보내기 네트워크 현황' }).waitFor({ timeout: 20_000 })
    },
    perform: async (page) => {
      await sleep(1_000)
      await page.getByRole('button', { name: 'AI에게 운송 요청하기', exact: true }).first().click()
      await page.getByRole('heading', { name: '보내실 화물을 알려주세요' }).waitFor()
      await sleep(1_000)
      await page.getByRole('button', { name: '음성 입력 시작' }).click()
      await sleep(5_000)
      await page.getByRole('button', { name: '음성 입력 종료' }).click()
      await page.getByRole('button', { name: 'AI로 받아쓴 조건 정리' }).click()
      await page.getByRole('button', { name: '인식 결과 확인·수정' }).click()
      await page.getByRole('button', { name: '다음' }).click()
      await page.getByRole('heading', { name: '어디까지 검토해볼까요?' }).waitFor()
    },
  },
  {
    view: 'request',
    prepare: prepareStepTwo,
    perform: async (page, workDir) => {
      await page.screenshot({ path: path.join(workDir, 'still-04-methods-1.png') })
      await sleep(3_000)
      await page.getByRole('button', { name: '±1일', exact: true }).click()
      await sleep(700)
      await scrollTo(page.getByText('지금 조건으로 찾을 수 있는 방법', { exact: true }), 700)
      await page.screenshot({ path: path.join(workDir, 'still-04-methods-3.png') })
    },
  },
  {
    view: 'proposals',
    prepare: async (page) => {
      await openDemo(page)
      await page.getByText('내 원래 계획 · 기준선', { exact: true }).waitFor({ timeout: 20_000 })
    },
    perform: async (page, workDir) => {
      await sleep(5_000)
      await scrollTo(page.getByText('내 원래 계획 · 기준선', { exact: true }), 1_000)
      await sleep(2_000)
      await page.getByRole('button', { name: /대안 1.*날짜 조정.*56만원/ }).click()
      await scrollTo(page.getByText('−56만원 · −18%', { exact: true }), 900)
      await page.screenshot({ path: path.join(workDir, 'still-05-savings.png') })
      await sleep(7_000)
      await scrollTo(page.getByText('탄소 약 0.3톤 CO₂ 절감 · −62%', { exact: true }), 900)
      await sleep(3_000)
      await page.getByRole('button', { name: '원래 계획과 상세 비교' }).click()
      await page.getByRole('table', { name: '내 원래 계획과 제안 비교' }).waitFor()
      await sleep(4_000)
      await scrollTo(page.getByRole('rowheader', { name: '전체 비용' }), 700)
      await sleep(3_000)
      await scrollTo(page.getByRole('rowheader', { name: '총 소요시간' }), 700)
      await sleep(2_000)
      await scrollTo(page.getByRole('rowheader', { name: '탄소 배출' }), 700)
    },
  },
  {
    view: 'pool',
    prepare: (page) => preparePool(page, false),
    perform: async (page, workDir) => {
      await sleep(2_000)
      await page.evaluate(() => window.__demo.fire(1))
      await sleep(2_000)
      await page.screenshot({ path: path.join(workDir, 'still-06-filled.png') })
      await sleep(5_000)
      await scrollTo(page.getByText('5건 · 전부 익명', { exact: true }), 1_000)
      await sleep(5_000)
      await scrollTo(page.getByText('화주 05', { exact: true }), 1_000)
      await page.screenshot({ path: path.join(workDir, 'still-06-anonymous.png') })
    },
  },
  {
    view: 'pool',
    prepare: (page) => preparePool(page, true),
    perform: async (page, workDir) => {
      await sleep(1_000)
      await page.evaluate(() => window.__demo.fire(3))
      await sleep(3_000)
      await page.getByRole('button', { name: '함께 보내기 푸시 알림 열기' }).click()
      await page.getByRole('heading', { name: '변동 알림' }).waitFor()
      await sleep(1_000)
      await page.evaluate(() => window.__demo.fire(2))
      await sleep(1_300)
      await scrollTo(page.getByText('3TEU가 빠져 현재 15/18TEU입니다.', { exact: true }), 500)
      await page.screenshot({ path: path.join(workDir, 'still-07-left.png') })
      await sleep(2_200)
      await page.evaluate(() => window.sessionStorage.setItem('railpool:view', 'proposals'))
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.getByText('내 원래 계획 · 기준선', { exact: true }).waitFor({ timeout: 20_000 })
      await page.getByRole('button', { name: '추천안 적용하기' }).click()
      await page.getByRole('heading', { name: '3TEU만 더 모이면 확정' }).waitFor({ timeout: 20_000 })
    },
  },
  {
    view: 'pool',
    prepare: (page) => preparePool(page, true),
    perform: async (page, workDir) => {
      await sleep(1_000)
      await page.getByRole('button', { name: '코레일에 검토 요청 보내기' }).click()
      await page.getByText('이 단계는 예약이 아닙니다', { exact: true }).waitFor()
      await sleep(2_000)
      await scrollTo(page.getByText('탄소 절감 자료', { exact: true }), 600)
      await page.getByText('탄소 절감 자료', { exact: true }).click()
      await scrollTo(page.getByText('약 0.3톤 CO₂ 절감 · −62%', { exact: true }), 600)
      await page.screenshot({ path: path.join(workDir, 'still-08-carbon.png') })
      await sleep(4_000)
      await scrollTo(page.getByText('전환교통 지원사업 안내', { exact: true }), 500)
      await page.getByText('전환교통 지원사업 안내', { exact: true }).click()
      await scrollTo(
        page.getByLabel('코레일 검토 요청 화면').getByText('사전 협약제', { exact: true }),
        500,
      )
    },
  },
  {
    view: 'dashboard',
    prepare: async (page) => {
      await openDemo(page, '')
      await page.getByRole('button', { name: '레일물류' }).waitFor({ timeout: 20_000 })
    },
    perform: async (page, workDir) => {
      await page.screenshot({ path: path.join(workDir, 'still-09-ending.png') })
    },
  },
]

async function encodeShot(workDir, recording) {
  const output = path.join(workDir, `shot-${String(recording.shotNumber).padStart(2, '0')}.mp4`)
  const duration = SHOT_SECONDS[recording.shotNumber - 1]
  run(FFMPEG, [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-ss', recording.captureOffset.toFixed(3),
    '-i', recording.rawPath,
    '-vf', `fps=30,scale=1920:1080:flags=lanczos,setsar=1,tpad=stop_mode=clone:stop_duration=3,trim=duration=${duration},setpts=PTS-STARTPTS`,
    '-frames:v', String(duration * 30),
    '-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', '30',
    output,
  ])
  return output
}

async function main() {
  const workDir = await mkdtemp(path.join(tmpdir(), 'railpool-demo-recording-'))
  await mkdir(path.join(workDir, 'raw'), { recursive: true })
  const browser = await chromium.launch({ headless: true, channel: 'chrome' })
  const recordings = []
  try {
    for (let index = 0; index < shotDefinitions.length; index += 1) {
      const definition = shotDefinitions[index]
      let recording
      let lastError
      for (let attempt = 1; attempt <= 3 && !recording; attempt += 1) {
        process.stdout.write(`SHOT ${index + 1}/9 recording · attempt ${attempt}\n`)
        try {
          recording = await recordShot(browser, workDir, index + 1, definition.view, definition.prepare, definition.perform)
        } catch (error) {
          lastError = error
          process.stderr.write(`SHOT ${index + 1} attempt ${attempt} failed: ${error.message}\n`)
          if (attempt < 3) await sleep(2_000)
        }
      }
      if (!recording) throw lastError
      recordings.push(recording)
    }
  } finally {
    await browser.close()
  }

  const clips = []
  for (const recording of recordings) clips.push(await encodeShot(workDir, recording))
  const concatFile = path.join(workDir, 'concat.txt')
  await writeFile(concatFile, clips.map((clip) => `file '${clip.replaceAll("'", "'\\''")}'`).join('\n'))
  const baseVideo = path.join(workDir, 'demo_3min_base.mp4')
  run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', concatFile, '-c', 'copy', baseVideo])

  const metadata = {
    baseUrl: BASE_URL,
    workDir,
    baseVideo,
    shots: recordings.map((recording) => ({
      shot: recording.shotNumber,
      seconds: SHOT_SECONDS[recording.shotNumber - 1],
      captureOffset: recording.captureOffset,
      rawPath: recording.rawPath,
      browserMessages: recording.browserMessages,
    })),
  }
  const metadataPath = path.join(workDir, 'metadata.json')
  await writeFile(metadataPath, JSON.stringify(metadata, null, 2))
  process.stdout.write(`${JSON.stringify({ workDir, baseVideo, metadataPath }, null, 2)}\n`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
