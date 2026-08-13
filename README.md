# 레일물류

코레일+의 `이동·편의` 화면에서 `레일택배` 옆 `레일물류`로 진입하는 화주용 철도 물류 서비스입니다. 화물 조건을 등록하면 같은 목적지의 익명 화주 네트워크를 확인하고, 현재 계획과 철도 함께 보내기의 비용·일정·탄소 차이를 비교한 뒤 코레일 담당자에게 검토를 요청할 수 있습니다.

이 저장소에는 공개 제품 코드만 있습니다. 팀 협업·Codex 제어 페이지는 별도 로컬 저장소에서 운영하며 이 GitHub 저장소에 포함하지 않습니다.

## 현재 동작

1. 코레일+ 홈/이동·편의 → `레일물류`
2. 직접 입력 또는 메일 붙여넣기 → 운송 조건 확인
3. 출발일·마감·화물역 등 조정 가능한 범위 선택
4. 현재 계획과 운송 제안 비교
5. 실제 DB 기반 함께 보내기 참여 현황 확인
6. 목표 물량 달성 후 코레일 담당자 검토 요청

Docker Compose에서 화주 에이전트 10개가 각각 독립 컨테이너로 실행됩니다. 에이전트는 5초마다 상태를 알리고, 사용자가 새 화물 요청을 분석하면 같은 목적지 에이전트가 최신 함께 보내기에 참여하거나 일정 변경에 따라 이탈합니다. 에이전트가 화면을 채우기 위한 화물 요청을 임의로 만들지는 않습니다. 모든 참여·이탈은 PostgreSQL에 저장되고 SSE로 화면에 즉시 반영됩니다.

## 기술 구성

```text
Vite + React frontend
        │ REST + SSE
        ▼
Node.js + Express API ─── optional Responses-compatible model (:8318)
        │
        ├── PostgreSQL
        ├── KORAIL / ODCloud public-data APIs
        └── 10 Docker shipper agents
```

- 프론트엔드: Vite 7, React 19, 코레일+ 디자인 시스템 토큰·공용 컴포넌트
- 백엔드: Node.js 22, Express 5
- DB: PostgreSQL 16
- 화주 네트워크: 독립 Docker 컨테이너 10개, 5초 heartbeat, 멱등 행동 기록
- 실시간 갱신: Server-Sent Events
- 선택형 문서 인식: Responses 호환 API, 기본 모델 `gpt-5.6-sol`
- 공공데이터: 철도 거리, 화물열차 시간표, 최저운임, 운임률, 상하역 시간, 화물역 하역선

## Docker 실행

```bash
cp .env.example .env
docker compose up -d --build
```

- 웹: `http://localhost:4173/galaxy-express/preview/`
- API 상태: `http://localhost:8320/health`
- PostgreSQL: `localhost:55432`

에이전트 쓰기 API의 인증 토큰은 API가 시작할 때 Docker named volume에 생성합니다. 저장소나 브라우저에는 노출하지 않습니다. 공공데이터 키와 선택적인 모델 인증정보도 로컬 `.env`에만 둡니다.

## 로컬 개발

```bash
pnpm install
pnpm dev
pnpm dev:api
```

로컬 API를 함께 실행하려면 PostgreSQL을 먼저 실행하고 `DATABASE_URL`을 설정하거나 Docker의 DB 서비스를 사용하세요.

## 검증

```bash
pnpm check
PLAYWRIGHT_BASE_URL=http://127.0.0.1:4173/galaxy-express/preview/ pnpm test:e2e
docker compose config --quiet
curl http://localhost:8320/health
```

`pnpm check`는 코레일+ 디자인 시스템 준수 검사, 프론트 프로덕션 빌드, 백엔드 계산 테스트, 화주 에이전트 정책 테스트를 실행합니다. Playwright는 390px 전체 사용자 흐름, 새로고침 상태 복원, 320px 오버플로·터치 영역을 검증합니다.

## 주요 디렉터리

```text
agents/                    화주 에이전트 10개의 공통 실행기·페르소나·정책
src/design-system/         코레일+ 토큰과 공용 컴포넌트
src/rail-logistics/        레일물류 모바일 흐름
server/src/                API, 실시간 이벤트, 에이전트 인증, 공공데이터 연결
server/test/               운송 조건·제안 계산 테스트
db/                        PostgreSQL 스키마
deploy/                    개발·운영 컨테이너 구성
scripts/                   디자인 시스템 준수 검사
```

## 운영 경계

- 화주 에이전트의 참여·이탈·물량 변화는 실제 컨테이너와 DB 이벤트이며, 회사명과 품목은 시연용 익명 페르소나입니다.
- 예상 비용과 탄소값은 비교용이며 실제 운임·적재 가능 여부·계약·배차·결제를 자동 확정하지 않습니다.
- 다른 화주의 상세 주소, 운임, 담당자 정보는 공개하지 않습니다.
- 위험물 또는 특수화물은 자동 계산을 중단하고 담당자 검토로 연결합니다.
- 공공데이터 연결 상태와 실제 운임 확정은 별개의 단계입니다.

코레일 및 관련 표장은 해당 권리자에게 귀속되며, 본 프로젝트는 MOVE-AI Challenge 2026 해커톤 프로토타입입니다.
