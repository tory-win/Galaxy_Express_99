# 레일물류 시연 영상

## 최종 결과

- 공개 재생 페이지: `https://macmini.tailbba978.ts.net/galaxy-express/preview/railpool-ai-demo.html`
- 공개 MP4: `https://macmini.tailbba978.ts.net/galaxy-express/preview/railpool-ai-demo.mp4`
- 최종 영상: `demo_showcase.mp4`
- 별도 자막: `demo_showcase.srt`
- 내레이션 원고·타이밍: `narration.md`
- 자막·음성 전 원본: `demo_3min_base.mp4`
- 촬영 기준: 현재 작업 트리의 앱 화면(별도 매뉴얼 패널은 촬영 전용 CSS로 제외)
- 촬영 URL: `https://macmini.tailbba978.ts.net/galaxy-express/preview/`

최종본은 2분, 1920×1080, 30fps, H.264/yuv420p입니다. 한국어 `Yuna` 내레이션을 48kHz AAC 스테레오로 넣었고 배경 음악은 사용하지 않았습니다. 통합 음량은 약 −16.0 LUFS, True Peak는 −4.5dBFS입니다.

공개 MP4는 Range 요청에 `206 Partial Content`로 응답해 브라우저에서 재생 위치 탐색이 가능합니다. 공개 파일과 로컬 최종본의 SHA-256은 `b02b86a7b8e62d8679c663b9e68826499076047aec0d816ecfe84c62532a9c70`로 일치합니다. 공개 페이지와 MP4 주소는 기존 경로를 그대로 유지한 채 최종 파일만 교체했습니다.

## 화면 구성

- 앱 휴대폰 화면만 촬영했습니다. 별도 매뉴얼 패널은 영상에서 제외했습니다.
- 실제 버튼 좌표를 따라 이동하고 클릭 효과가 표시되는 마우스 커서를 촬영했습니다.
- 9개 단계 라벨과 `이 화면에서 확인` 카드를 좌·우 빈 여백에 배치했습니다.
- 자막 띠는 휴대폰 하단 끝(y≈884)보다 아래인 y=902부터 배치해 앱 화면을 가리지 않습니다.
- 핵심 숫자는 휴대폰 왼쪽 빈 여백에만 표시했습니다.
- 모든 구간에 `가상 데이터 기반 시연 화면입니다` 워터마크를 표시합니다.
- 자막은 한 큐당 최대 두 줄이며 `demo_showcase.srt`와 동일합니다.

## 9개 시연 단계

1. 0:00–0:10 — 함께 보내기 15/18TEU → 18/18TEU, 1TEU당 61만원
2. 0:10–0:22 — 코레일 홈에서 레일물류 진입
3. 0:22–0:34 — 음성으로 운송 조건 입력, AI가 핵심 필드 정리
4. 0:34–0:44 — 날짜·분할·직송 허용 범위로 검토 조합 설정
5. 0:44–1:08 — 312만원 → 256만원, −56만원·−18%, 도착 +4시간·마감 위험 비교
6. 1:08–1:28 — 익명 화주 합류, 목표 물량 달성, 내 예상 비용 243만원
7. 1:28–1:40 — 참여·이탈·일정 변경 푸시 알림
8. 1:40–1:53 — 예약이 아닌 코레일 검토 요청, 예상값·협약 조건 확인
9. 1:53–2:00 — 코레일 담당자 최종 확정 원칙과 서비스 메시지

## 영상에 포함한 필수 매뉴얼 항목

- 출발지·도착지·물량·마감·현재 비용 확인
- 날짜·분할·직송 허용 범위가 제안 조합 수를 바꾸는 방식
- 철도 운임이 아닌 공장부터 항만까지의 전체 비용·시간·탄소 비교
- 더 싼 대안이라도 참여 화물을 기다리면 마감을 놓칠 수 있는 위험
- 권역·TEU만 보이고 회사명·품목·상세 주소는 보이지 않는 익명 참여
- 마감까지 목표 물량 미달 시 자동 취소되고 비용이 발생하지 않는 원칙
- 제안의 비용·시간·탄소는 예상값이며, 운송 가능 여부와 최종 운임은 코레일 담당자가 확정한다는 원칙

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

`pnpm record:demo`가 출력하는 `baseVideo` 경로를 `BASE_VIDEO`에 넣으면 됩니다. `pnpm postprocess:demo`는 화면 흐름을 압축하고, 9개 단계 안내·화면 밖 자막·숫자 강조·가상 데이터 워터마크·한국어 음성을 생성합니다.

## 최종 검수

- `pnpm build` 통과
- 공개 페이지 제목·영상 길이·재생·음성 확인
- 공개 MP4 Range 요청 `206 Partial Content` 확인
- 최종 영상: 영상·음성 트랙, 120.000초, 1920×1080, 30fps 확인
- 대표 9개 시점 프레임으로 앱 화면·자막·매뉴얼 카드 미중첩 확인
- 촬영용 mock 관련 6개 범위 0건 확인
