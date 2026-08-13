# RAILPOOL AI 3분 매뉴얼 영상

## 최종 결과

- 공개 재생 페이지: `https://macmini.tailbba978.ts.net/galaxy-express/preview/railpool-ai-3min.html`
- 공개 MP4: `https://macmini.tailbba978.ts.net/galaxy-express/preview/railpool-ai-3min.mp4`
- 최종 영상: `demo_3min.mp4`
- 별도 자막: `demo_3min.srt`
- 내레이션 원고·타이밍: `narration.md`
- 자막·음성 전 원본: `demo_3min_base.mp4`
- 촬영 기준 소스 커밋: `80e099d09c01c88991079e487d9f1d8fb7f68bcc`
- 촬영 URL: `https://macmini.tailbba978.ts.net/galaxy-express/preview/`

최종본은 3분 정확히, 1920×1080, 30fps, H.264/yuv420p입니다. 한국어 `Yuna` 내레이션을 48kHz AAC 스테레오로 넣었고 배경 음악은 사용하지 않았습니다. 통합 음량은 약 −15.9 LUFS, True Peak는 −4.5dBFS입니다.

공개 MP4는 Range 요청에 `206 Partial Content`로 응답해 브라우저에서 재생 위치 탐색이 가능합니다. 공개 파일과 로컬 최종본의 SHA-256은 모두 `780ae3dd181f3d3080f03d7657f22a8f72f21204a37fae69a9276f4666223190`으로 일치합니다.

## 화면 구성

- 앱 휴대폰 화면만 녹화했습니다. 별도 매뉴얼 패널은 사용자 요청에 따라 영상에서 제외했습니다.
- 자막 띠는 휴대폰 하단 끝(y≈884)보다 아래인 y=902부터 배치해 앱 화면을 가리지 않습니다.
- 핵심 숫자는 휴대폰 왼쪽 빈 여백에만 표시합니다.
- 모든 구간에 `가상 데이터 기반 시연 화면입니다` 워터마크를 표시합니다.
- 자막은 한 큐당 최대 두 줄이며 `demo_3min.srt`와 동일합니다.

## 9개 장면

1. 0:00–0:12 — 함께 보내기 15/18TEU → 18/18TEU, 1TEU당 61만원
2. 0:12–0:30 — 코레일 홈에서 레일물류 진입
3. 0:30–0:50 — 음성으로 운송 조건 입력, RAILPOOL AI 조건 정리
4. 0:50–1:05 — 날짜 허용 시 검토 방법 1가지 → 3가지
5. 1:05–1:45 — 312만원 → 256만원, −56만원·−18%, 도착 +4시간 비교
6. 1:45–2:15 — 익명 화주 5곳, 목표 물량 달성, 내 비용 243만원
7. 2:15–2:35 — 푸시 알림, 참여·이탈 변동, 추천안 적용
8. 2:35–2:50 — 예약이 아닌 코레일 검토 요청, 탄소 약 0.3톤·−62%
9. 2:50–3:00 — 코레일 홈과 서비스 메시지로 종료

## 촬영 데이터 처리

촬영에는 `R-DEMO-VIDEO` 한 건만 사용했습니다. 촬영 전 `scripts/demo-video-data.sql`로 넣고 촬영 직후 `scripts/demo-video-cleanup.sql`로 삭제했습니다. 삭제 후 아래 6개 범위를 직접 조회해 모두 0건임을 확인했습니다.

- `freight_requests`
- `proposals`
- `pool_summaries`
- `pool_members`
- `proposal_decisions`
- `review_requests`

영상에 보이는 회사명, 화주, 운임, 일정, 탄소 수치는 전부 촬영용 가상·예상 데이터입니다.

## 재현 방법

```bash
docker compose exec -T db psql -U railpool -d railpool < scripts/demo-video-data.sql
DEMO_BASE_URL=https://macmini.tailbba978.ts.net/galaxy-express/preview/ pnpm record:demo
BASE_VIDEO=/absolute/path/to/demo_3min_base.mp4 pnpm postprocess:demo
docker compose exec -T db psql -U railpool -d railpool < scripts/demo-video-cleanup.sql
```

`pnpm record:demo`가 출력하는 `baseVideo` 경로를 `BASE_VIDEO`에 넣으면 됩니다. `pnpm postprocess:demo`는 화면 밖 자막, 숫자 강조, 가상 데이터 워터마크, 장면 길이에 맞춘 한국어 음성을 생성합니다.

## 최종 검수

- `pnpm build` 통과
- 일반 공개 경로에서 `window.__demo` 미노출 확인
- 일반 공개 경로 요청 실패·페이지 오류 0건 확인
- 최종 영상: 영상·음성 트랙 존재, 180.000초, 1920×1080, 30fps 확인
- 대표 7개 시점 프레임으로 앱 화면과 자막 미중첩 확인
- 촬영용 mock 관련 6개 범위 0건 확인
