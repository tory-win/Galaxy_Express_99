import { chromium } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { copyFile, mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

const FFMPEG = process.env.FFMPEG || '/opt/homebrew/bin/ffmpeg'
const FFPROBE = process.env.FFPROBE || '/opt/homebrew/bin/ffprobe'
const BASE_VIDEO = process.env.BASE_VIDEO || path.resolve('out/demo_3min_base.mp4')
const OUTPUT_DIR = path.resolve(process.env.DEMO_OUTPUT_DIR || 'out')
const VOICE = process.env.DEMO_VOICE || 'Yuna'
const VOICE_RATE = process.env.DEMO_VOICE_RATE || '185'
const TOTAL_SECONDS = 180

const cues = [
  {
    start: 0,
    end: 6,
    text: '화차 한 량이 채워지는 순간,\n참여한 모든 회사의 단가가 동시에 내려갑니다.',
  },
  {
    start: 6,
    end: 12,
    text: '이 장면을 만들려고 한 일을\n3분 안에 보여드리겠습니다.',
    voice: '이 장면을 만들려고 한 일을 삼 분 안에 보여드리겠습니다.',
  },
  {
    start: 12,
    end: 21,
    text: '화물이 없는 게 아니라\n조합이 안 맞는 겁니다.',
  },
  {
    start: 21,
    end: 30,
    text: '새 앱을 만들지 않았습니다.\n레일택배 옆 아이콘 하나입니다.',
  },
  {
    start: 30,
    end: 50,
    text: '전화로 받던 조건을 그대로 말하면\nRAILPOOL AI가 조건을 정리합니다.',
    voice: '전화로 받던 조건을 그대로 말하면 레일풀 에이아이가 조건을 정리합니다.',
  },
  {
    start: 50,
    end: 57.5,
    text: '화주가 뭘 양보할 수 있는지를\n먼저 물어봅니다.',
  },
  {
    start: 57.5,
    end: 65,
    text: '하루를 여는 순간\n찾을 수 있는 방법이 3배가 됩니다.',
    voice: '하루를 여는 순간 찾을 수 있는 방법이 세 배가 됩니다.',
  },
  {
    start: 65,
    end: 78,
    text: '하루만 옮기시면\n전체 비용이 18% 낮아집니다.',
    voice: '하루만 옮기시면 전체 비용이 십팔 퍼센트 낮아집니다.',
  },
  {
    start: 78,
    end: 92,
    text: '철도 운임만이 아니라 공장에서 부산신항까지\n전체 비용을 비교한 결과입니다.',
  },
  {
    start: 92,
    end: 105,
    text: '대신 도착이 4시간 늦어집니다.\n그 차이도 함께 보여드립니다.',
    voice: '대신 도착이 네 시간 늦어집니다. 그 차이도 함께 보여드립니다.',
  },
  {
    start: 105,
    end: 115,
    text: '같은 시각 다른 화주가\n3TEU를 등록합니다.',
    voice: '같은 시각 다른 화주가 삼 티이유를 등록합니다.',
  },
  {
    start: 115,
    end: 125,
    text: '화차가 채워지고\n참여한 화주 모두의 단가가 내려갑니다.',
  },
  {
    start: 125,
    end: 135,
    text: '이 로직은 다른 구간에도\n그대로 적용됩니다.',
  },
  {
    start: 135,
    end: 145,
    text: '메일은 안 봅니다.\n푸시는 봅니다.',
  },
  {
    start: 145,
    end: 155,
    text: '이게 코레일 앱 안에 있어야 하는\n이유입니다.',
  },
  {
    start: 155,
    end: 162.5,
    text: '예약하지 않습니다.\n검토를 요청합니다.',
  },
  {
    start: 162.5,
    end: 170,
    text: '확정은 코레일 담당자가 합니다.',
  },
  {
    start: 170,
    end: 175,
    text: '저희는 화물을 철도로 밀어 넣는\n서비스가 아닙니다.',
  },
  {
    start: 175,
    end: 180,
    text: '흩어진 화물과 비어 있는 자리를 이어붙여,\n철도가 성립하는 조건을 먼저 만듭니다.',
  },
]

const keyOverlays = [
  { start: 4, end: 12, title: '15/18 → 18/18 TEU', detail: '1TEU당 61만원' },
  { start: 80, end: 105, title: '312만원 → 256만원', detail: '−56만원 / −18%' },
  { start: 115, end: 135, title: '18/18 TEU 달성', detail: '내 비용 243만원' },
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

  const watermarkPath = path.join(workDir, 'overlay-watermark.png')
  await renderOverlay(page, watermarkPath, `
    <div style="position:absolute;right:36px;bottom:15px;padding:4px 12px;border-radius:10px;background:rgba(18,24,38,.62);color:rgba(255,255,255,.92);font-size:20px;font-weight:600;letter-spacing:-.2px;">
      가상 데이터 기반 시연 화면입니다
    </div>`)
  images.push({ filePath: watermarkPath })

  for (const [index, cue] of cues.entries()) {
    const cuePath = path.join(workDir, `overlay-caption-${String(index + 1).padStart(2, '0')}.png`)
    const lines = cue.text.split('\n').map(escapeHtml).join('<br>')
    await renderOverlay(page, cuePath, `
      <div style="position:absolute;left:250px;top:902px;width:1420px;height:118px;display:flex;align-items:center;justify-content:center;padding:10px 40px;border-radius:22px;background:rgba(15,23,42,.88);box-shadow:0 10px 30px rgba(15,23,42,.18);color:white;text-align:center;font-size:38px;line-height:1.24;font-weight:700;letter-spacing:-.7px;">
        <div>${lines}</div>
      </div>`)
    images.push({ filePath: cuePath, start: cue.start, end: cue.end })
  }

  for (const [index, key] of keyOverlays.entries()) {
    const keyPath = path.join(workDir, `overlay-key-${index + 1}.png`)
    await renderOverlay(page, keyPath, `
      <div style="position:absolute;left:84px;top:282px;width:560px;padding:26px 30px;border-radius:24px;background:rgba(255,255,255,.94);border:2px solid rgba(37,99,235,.20);box-shadow:0 16px 40px rgba(15,23,42,.12);">
        <div style="color:#0f172a;font-size:42px;line-height:1.12;font-weight:800;letter-spacing:-1.2px;white-space:nowrap;">${escapeHtml(key.title)}</div>
        <div style="margin-top:12px;color:#2563eb;font-size:32px;line-height:1.15;font-weight:800;letter-spacing:-.7px;white-space:nowrap;">${escapeHtml(key.detail)}</div>
      </div>`)
    images.push({ filePath: keyPath, start: key.start, end: key.end })
  }

  await browser.close()
  return images
}

async function createCaptionedVideo(workDir, overlayImages) {
  const captionedPath = path.join(workDir, 'demo-captioned.mp4')
  const args = ['-y', '-i', BASE_VIDEO]
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
  await writeFile(path.join(OUTPUT_DIR, 'demo_3min.srt'), srt)

  const timingByIndex = new Map(timings.map((timing) => [timing.index, timing]))
  const narration = [
    '# RAILPOOL AI 3분 시연 내레이션',
    '',
    `- 음성: macOS 한국어 ${VOICE}`,
    `- 기본 속도: ${VOICE_RATE}`,
    '- 배경 음악: 없음',
    '- 자막은 휴대폰 화면 아래 여백에만 표시',
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
  const overlayImages = await createOverlayImages(workDir)
  const [captionedPath, narration] = await Promise.all([
    createCaptionedVideo(workDir, overlayImages),
    createNarration(workDir),
  ])

  const outputPath = path.join(OUTPUT_DIR, 'demo_3min.mp4')
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
  await copyFile(BASE_VIDEO, path.join(OUTPUT_DIR, 'demo_3min_base.mp4'))
  await writeTextArtifacts(narration.timings)

  const result = {
    outputPath,
    baseVideo: BASE_VIDEO,
    workDir,
    duration: probeDuration(outputPath),
    voice: VOICE,
    voiceRate: Number(VOICE_RATE),
    cues: cues.length,
  }
  await writeFile(path.join(OUTPUT_DIR, 'postprocess-metadata.json'), `${JSON.stringify(result, null, 2)}\n`)
  console.log(JSON.stringify(result, null, 2))
}

await main()
