import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg'
const FFPROBE = process.env.FFPROBE || '/opt/homebrew/bin/ffprobe'
const BASE_VIDEO = process.env.BASE_VIDEO || path.resolve('out/demo_3min_base.mp4')
const OUTPUT_DIR = path.resolve(process.env.DEMO_OUTPUT_DIR || 'out')
const VOICE = process.env.DEMO_VOICE || 'Yuna'
const VOICE_RATE = process.env.DEMO_VOICE_RATE || '185'
const SOURCE_SHOT_SECONDS = [12, 18, 20, 15, 40, 30, 20, 15, 10]
const TARGET_SHOT_SECONDS = [10, 12, 12, 10, 24, 20, 12, 12, 8]
const TOTAL_SECONDS = TARGET_SHOT_SECONDS.reduce((sum, seconds) => sum + seconds, 0)

const cues = [
  {
    start: 0,
    end: 5.3,
    text: '화차가 채워지면 참여한 화주의\n예상 단가가 함께 내려갑니다.',
  },
  {
    start: 5.3,
    end: 10,
    text: 'RAILPOOL AI의 요청부터 검토까지\n핵심 흐름을 빠르게 보겠습니다.',
    voice: '레일풀 에이아이의 요청부터 검토까지 핵심 흐름을 빠르게 보겠습니다.',
  },
  {
    start: 10,
    end: 15,
    text: '화물이 없는 게 아니라\n서로 맞는 조합을 찾지 못한 겁니다.',
  },
  {
    start: 15,
    end: 22,
    text: '코레일 앱의 레일물류 아이콘에서\n별도 설치 없이 바로 시작합니다.',
  },
  {
    start: 22,
    end: 28,
    text: '전화로 받던 운송 조건을 말하면\nRAILPOOL AI가 항목별로 정리합니다.',
    voice: '전화로 받던 운송 조건을 말하면 레일풀 에이아이가 항목별로 정리합니다.',
  },
  {
    start: 28,
    end: 34,
    text: '출발지·도착지·물량·마감·현재 비용을\n확인하고 필요한 값만 수정합니다.',
  },
  {
    start: 34,
    end: 39,
    text: '화주가 양보 가능한 조건을\n먼저 선택합니다.',
  },
  {
    start: 39,
    end: 44,
    text: '날짜를 하루 열면 검토 가능한 운송 조합이\n한 가지에서 세 가지가 됩니다.',
  },
  {
    start: 44,
    end: 50,
    text: '하루만 조정하면\n전체 비용이 18% 낮아집니다.',
    voice: '하루만 조정하면 전체 비용이 십팔 퍼센트 낮아집니다.',
  },
  {
    start: 50,
    end: 56,
    text: '철도 운임만이 아니라 공장에서 항만까지\n전체 운송비를 비교합니다.',
  },
  {
    start: 56,
    end: 62,
    text: '대신 도착은 4시간 늦어집니다.\n비용과 시간 차이를 함께 봅니다.',
    voice: '대신 도착은 네 시간 늦어집니다. 비용과 시간 차이를 함께 봅니다.',
  },
  {
    start: 62,
    end: 68,
    text: '더 저렴한 대안도 마감 위험이 있으면\n추천 순위가 달라질 수 있습니다.',
  },
  {
    start: 68,
    end: 73,
    text: '다른 화주의 3TEU가 합류하면\n목표 물량이 채워집니다.',
    voice: '다른 화주의 삼 티이유가 합류하면 목표 물량이 채워집니다.',
  },
  {
    start: 73,
    end: 78,
    text: '참여 화주 모두의 예상 단가와\n내 예상 비용이 다시 계산됩니다.',
  },
  {
    start: 78,
    end: 83,
    text: '참여사는 권역과 물량만 보이며\n회사명·품목·상세 주소는 비공개입니다.',
  },
  {
    start: 83,
    end: 88,
    text: '마감까지 목표를 못 채우면 자동 취소되며\n비용은 발생하지 않습니다.',
  },
  {
    start: 88,
    end: 94,
    text: '참여·이탈·일정 변경은\n푸시와 변동 알림으로 확인합니다.',
  },
  {
    start: 94,
    end: 100,
    text: '메일보다 빠른 알림이 필요한 이유이자\n코레일 앱 안에 있어야 하는 이유입니다.',
  },
  {
    start: 100,
    end: 104,
    text: '이 단계는 예약이 아니라\n코레일 검토 요청입니다.',
  },
  {
    start: 104,
    end: 108,
    text: '운송 가능 여부와 최종 운임은\n코레일 담당자가 확정합니다.',
  },
  {
    start: 108,
    end: 113,
    text: '비용·시간·탄소는 예상값입니다.\n필수 확인과 협약 조건도 보세요.',
  },
  {
    start: 113,
    end: 120,
    text: '흩어진 화물과 빈 자리를 연결해\n철도가 성립하는 조건을 먼저 만듭니다.',
  },
]

const keyOverlays = [
  { start: 3.3, end: 10, title: '15/18 → 18/18 TEU', detail: '1TEU당 61만원' },
  { start: 53, end: 68, title: '312만원 → 256만원', detail: '−56만원 / −18%' },
  { start: 74.7, end: 88, title: '18/18 TEU 달성', detail: '내 비용 243만원' },
]

const manualOverlays = [
  { start: 0, end: 10, number: '01', title: '함께 보내기 효과', checks: ['모집률·단가·참여 화물', '목표 달성 시 단가 재계산'] },
  { start: 10, end: 22, number: '02', title: '코레일 앱 진입', checks: ['레일택배 옆 레일물류 아이콘', '별도 앱 설치 없음'] },
  { start: 22, end: 34, number: '03', title: 'AI 운송 요청', checks: ['음성·조건·문서 입력', '핵심 필드 확인 후 수정'] },
  { start: 34, end: 44, number: '04', title: '검토 범위 설정', checks: ['날짜·분할·직송 허용 범위', '허용 범위가 조합 수를 결정'] },
  { start: 44, end: 68, number: '05', title: '제안 비교', checks: ['전체 비용·소요시간·탄소', '더 싼 안의 마감 위험까지 비교'] },
  { start: 68, end: 88, number: '06', title: '익명 공동 운송', checks: ['권역·TEU만 익명 공개', '목표 미달 시 자동 취소·비용 없음'] },
  { start: 88, end: 100, number: '07', title: '실시간 알림', checks: ['참여·이탈·일정 변경', '푸시 알림에서 즉시 확인'] },
  { start: 100, end: 113, number: '08', title: '코레일 검토 요청', checks: ['예약이 아닌 검토 요청', '예상값·필수 확인·협약 조건'] },
  { start: 113, end: 120, number: '09', title: '최종 확정 원칙', checks: ['코레일 담당자 최종 확정', '가상 데이터 기반 시연'] },
]

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: 'inherit', ...options })
}

function probeDuration(filePath) {
  return Number(execFileSync(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], { encoding: 'utf8' }).trim())
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function srtTimestamp(seconds) {
  const milliseconds = Math.round(seconds * 1_000)
  const hours = Math.floor(milliseconds / 3_600_000)
  const minutes = Math.floor((milliseconds % 3_600_000) / 60_000)
  const secs = Math.floor((milliseconds % 60_000) / 1_000)
  const millis = milliseconds % 1_000
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(millis).padStart(3, '0')}`
}

function atempoChain(factor) {
  const filters = []
  let remaining = factor
  while (remaining > 2) {
    filters.push('atempo=2')
    remaining /= 2
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5')
    remaining /= 0.5
  }
  filters.push(`atempo=${remaining.toFixed(6)}`)
  return filters.join(',')
}

async function renderOverlay(page, filePath, body) {
  await page.setContent(`<!doctype html>
    <html lang="ko"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      html, body { width: 1920px; height: 1080px; margin: 0; overflow: hidden; background: transparent; }
      body { position: relative; font-family: "Apple SD Gothic Neo", "Noto Sans CJK KR", sans-serif; }
    </style></head><body>${body}</body></html>`)
  await page.screenshot({ path: filePath, omitBackground: true })
}

async function createOverlayImages(workDir) {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 })
  const images = []

  for (const [index, cue] of cues.entries()) {
    const cuePath = path.join(workDir, `overlay-combined-${String(index + 1).padStart(2, '0')}.png`)
    const midpoint = (cue.start + cue.end) / 2
    const manual = manualOverlays.find((item) => midpoint >= item.start && midpoint < item.end)
    const key = keyOverlays.find((item) => cue.end > item.start && cue.start < item.end)
    const lines = cue.text.split('\n').map(escapeHtml).join('<br>')
    const checks = manual.checks
      .map((check) => `<div style="display:flex;align-items:flex-start;gap:12px;"><span style="color:#2563eb;font-weight:900;">✓</span><span>${escapeHtml(check)}</span></div>`)
      .join('')
    const keyMarkup = key
      ? `<div style="position:absolute;left:84px;top:282px;width:560px;padding:26px 30px;border-radius:24px;background:rgba(255,255,255,.94);border:2px solid rgba(37,99,235,.20);box-shadow:0 16px 40px rgba(15,23,42,.12);">
          <div style="color:#0f172a;font-size:42px;line-height:1.12;font-weight:800;letter-spacing:-1.2px;white-space:nowrap;">${escapeHtml(key.title)}</div>
          <div style="margin-top:12px;color:#2563eb;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.7px;white-space:nowrap;">${escapeHtml(key.detail)}</div>
        </div>`
      : ''
    await renderOverlay(page, cuePath, `
      <div style="position:absolute;left:84px;top:64px;display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:999px;background:rgba(37,99,235,.94);box-shadow:0 10px 28px rgba(37,99,235,.20);color:white;font-size:24px;font-weight:800;letter-spacing:-.4px;">
        <span style="opacity:.78;">STEP ${escapeHtml(manual.number)}</span>
        <span>${escapeHtml(manual.title)}</span>
      </div>
      ${keyMarkup}
      <div style="position:absolute;left:1276px;top:246px;width:560px;padding:26px 28px;border-radius:24px;background:rgba(255,255,255,.95);border:1px solid rgba(15,23,42,.08);box-shadow:0 18px 48px rgba(15,23,42,.12);">
        <div style="color:#64748b;font-size:20px;font-weight:800;letter-spacing:.02em;">이 화면에서 확인</div>
        <div style="margin-top:12px;color:#0f172a;font-size:32px;line-height:1.2;font-weight:800;letter-spacing:-.8px;">${escapeHtml(manual.title)}</div>
        <div style="display:grid;gap:13px;margin-top:20px;color:#334155;font-size:25px;line-height:1.28;font-weight:700;letter-spacing:-.45px;">${checks}</div>
      </div>
      <div style="position:absolute;left:250px;top:902px;width:1420px;height:118px;display:flex;align-items:center;justify-content:center;padding:10px 40px;border-radius:22px;background:rgba(15,23,42,.88);box-shadow:0 10px 30px rgba(15,23,42,.18);color:white;text-align:center;font-size:38px;line-height:1.24;font-weight:700;letter-spacing:-.7px;">
        <div>${lines}</div>
      </div>
      <div style="position:absolute;right:36px;bottom:15px;padding:4px 12px;border-radius:10px;background:rgba(18,24,38,.62);color:rgba(255,255,255,.92);font-size:20px;font-weight:600;letter-spacing:-.2px;">
        가상 데이터 기반 시연 화면입니다
      </div>`)
    images.push({ filePath: cuePath, start: cue.start, end: cue.end })
  }

  await browser.close()
  return images
}

async function createTimelineVideo(workDir) {
  const timelinePath = path.join(workDir, 'demo-showcase-timeline.mp4')
  const filters = []
  const inputs = []
  let sourceStart = 0

  for (let index = 0; index < SOURCE_SHOT_SECONDS.length; index += 1) {
    const sourceSeconds = SOURCE_SHOT_SECONDS[index]
    const targetSeconds = TARGET_SHOT_SECONDS[index]
    const ratio = targetSeconds / sourceSeconds
    filters.push(
      `[0:v]trim=start=${sourceStart}:duration=${sourceSeconds},setpts=(PTS-STARTPTS)*${ratio.toFixed(9)}[shot${index}]`,
    )
    inputs.push(`[shot${index}]`)
    sourceStart += sourceSeconds
  }

  filters.push(
    `${inputs.join('')}concat=n=${inputs.length}:v=1:a=0,fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration=${TOTAL_SECONDS},setpts=PTS-STARTPTS,format=yuv420p[timeline]`,
  )
  run(FFMPEG, [
    '-y',
    '-i', BASE_VIDEO,
    '-filter_complex', filters.join(';'),
    '-map', '[timeline]',
    '-an',
    '-frames:v', String(TOTAL_SECONDS * 30),
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '16',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    timelinePath,
  ])
  return timelinePath
}

async function createCaptionedVideo(workDir, timelinePath, overlayImages) {
  const captionedPath = path.join(workDir, 'demo-captioned.mp4')
  const args = ['-y', '-i', timelinePath]
  for (const overlay of overlayImages) {
    args.push('-loop', '1', '-framerate', '30', '-i', overlay.filePath)
  }

  let current = '[0:v]'
  const filters = []
  for (const [index, overlay] of overlayImages.entries()) {
    const output = `[v${index + 1}]`
    const enable = overlay.start === undefined
      ? ''
      : `:enable='between(t,${overlay.start},${overlay.end - 0.001})'`
    filters.push(`${current}[${index + 1}:v]overlay=0:0:eof_action=repeat${enable}${output}`)
    current = output
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', current,
    '-an',
    '-t', String(TOTAL_SECONDS),
    '-r', '30',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    captionedPath,
  )
  run(FFMPEG, args)
  return captionedPath
}

async function createNarration(workDir) {
  const segments = []
  const timings = []

  for (const [index, cue] of cues.entries()) {
    const number = String(index + 1).padStart(2, '0')
    const sourcePath = path.join(workDir, `voice-${number}.aiff`)
    const segmentPath = path.join(workDir, `voice-${number}.wav`)
    const spokenText = cue.voice || cue.text.replaceAll('\n', ' ')
    run('/usr/bin/say', ['-v', VOICE, '-r', VOICE_RATE, '-o', sourcePath, spokenText])

    const sourceDuration = probeDuration(sourcePath)
    const cueDuration = cue.end - cue.start
    const spokenWindow = Math.max(0.5, cueDuration - 0.5)
    const factor = Math.max(1, sourceDuration / spokenWindow)
    const filters = [
      ...(factor > 1.001 ? [atempoChain(factor)] : []),
      'adelay=250:all=1',
      `apad=whole_dur=${cueDuration}`,
      `atrim=0:${cueDuration}`,
      'asetpts=N/SR/TB',
    ]
    run(FFMPEG, [
      '-y', '-i', sourcePath,
      '-af', filters.join(','),
      '-ar', '48000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      segmentPath,
    ])
    segments.push(segmentPath)
    timings.push({ index: index + 1, sourceDuration, cueDuration, tempo: factor })
  }

  const concatList = path.join(workDir, 'narration-segments.txt')
  await writeFile(concatList, segments.map((segment) => `file '${segment.replaceAll("'", "'\\''")}'`).join('\n'))
  const narrationPath = path.join(workDir, 'narration.wav')
  run(FFMPEG, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatList,
    '-af', `loudnorm=I=-16:TP=-1.5:LRA=7,apad,atrim=0:${TOTAL_SECONDS}`,
    '-ar', '48000',
    '-ac', '1',
    '-c:a', 'pcm_s16le',
    narrationPath,
  ])
  return { narrationPath, timings }
}

async function writeTextArtifacts(timings) {
  const srt = cues.map((cue, index) => [
    String(index + 1),
    `${srtTimestamp(cue.start)} --> ${srtTimestamp(cue.end)}`,
    cue.text,
  ].join('\n')).join('\n\n') + '\n'
  await writeFile(path.join(OUTPUT_DIR, 'demo_showcase.srt'), srt)

  const timingByIndex = new Map(timings.map((timing) => [timing.index, timing]))
  const narration = [
    '# RAILPOOL AI 시연 영상 내레이션',
    '',
    `- 음성: macOS 한국어 ${VOICE}`,
    `- 기본 속도: ${VOICE_RATE}`,
    `- 최종 길이: ${TOTAL_SECONDS}초`,
    '- 배경 음악: 없음',
    '- 자막은 휴대폰 화면 아래 여백에만 표시',
    '- 별도 매뉴얼 패널은 녹화하지 않고 좌우 여백의 단계·확인 카드로 설명',
    '',
    '| 구간 | 화면 자막·내레이션 | 원음 길이 | 속도 보정 |',
    '| --- | --- | ---: | ---: |',
    ...cues.map((cue, index) => {
      const timing = timingByIndex.get(index + 1)
      const text = cue.text.replaceAll('\n', ' / ')
      return `| ${srtTimestamp(cue.start).replace(',', '.')}–${srtTimestamp(cue.end).replace(',', '.')} | ${text} | ${timing.sourceDuration.toFixed(2)}초 | ${timing.tempo.toFixed(3)}× |`
    }),
    '',
    '모든 수치·회사·화주는 촬영용 가상 데이터입니다.',
    '',
  ].join('\n')
  await writeFile(path.join(OUTPUT_DIR, 'narration.md'), narration)
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true })
  await readFile(BASE_VIDEO)
  const workDir = await mkdtemp(path.join(tmpdir(), 'railpool-postprocess-'))
  const timelinePath = await createTimelineVideo(workDir)
  const overlayImages = await createOverlayImages(workDir)
  const [captionedPath, narration] = await Promise.all([
    createCaptionedVideo(workDir, timelinePath, overlayImages),
    createNarration(workDir),
  ])

  const outputPath = path.join(OUTPUT_DIR, 'demo_showcase.mp4')
  run(FFMPEG, [
    '-y',
    '-i', captionedPath,
    '-i', narration.narrationPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-t', String(TOTAL_SECONDS),
    '-movflags', '+faststart',
    outputPath,
  ])
  await writeTextArtifacts(narration.timings)

  const result = {
    title: 'RAILPOOL AI 시연 영상',
    outputPath: path.relative(process.cwd(), outputPath),
    baseVideo: path.relative(process.cwd(), BASE_VIDEO),
    duration: probeDuration(outputPath),
    width: 1920,
    height: 1080,
    fps: 30,
    voice: VOICE,
    voiceRate: Number(VOICE_RATE),
    cues: cues.length,
    manualPanelRecorded: false,
    manualOverlaySteps: manualOverlays.length,
  }
  await writeFile(path.join(OUTPUT_DIR, 'showcase-metadata.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify({ ...result, workDir }, null, 2))
}

await main()
