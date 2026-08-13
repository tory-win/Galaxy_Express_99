# RAILPOOL AI · 레일물류

코레일+의 `이동·편의` 화면에서 `레일택배` 바로 옆 `레일물류` 버튼으로 진입하는 화주용 철도 물류 역제안 서비스입니다. 사용자가 입력한 조건을 그대로 견적 내는 대신, 기존 정기열차와 같은 구간의 익명 화물을 조합해 비용·시간·탄소를 함께 비교하고 더 나은 조건을 제안합니다.

이 저장소에는 공개할 제품 코드만 있습니다. 팀 협업·Codex 제어 페이지는 별도 로컬 저장소에서 운영하며 이 GitHub 저장소에 포함하지 않습니다.

## 구현된 시연 흐름

1. 코레일+ 홈/이동·편의 → `레일물류`
2. 사내 메일 붙여넣기 → 조건 자동 인식과 원문 근거 확인
3. 7개 조정 축 설정 → 가능한 역제안 수 실시간 변경
4. AI 역제안 2건 + 전환 시점 안내
5. 현재 도로 운송과 제안의 20개 항목 모바일 비교
6. 익명 함께 보내기 현황
7. `B사 3TEU 등록` 시연 → 목표 물량 달성 → 1TEU당 단가 하락
8. 참여사 이탈 푸시 → AI 대체 조합 → 새 조건 수락
9. 예약이 아닌 코레일 담당자 검토 요청

비용·시간·탄소의 추정값에는 신뢰도 배지를 표시하며, 실제 철도 운임·적재 가능 여부·위험물 취급 가능 여부는 임의로 확정하지 않습니다.

## 기술 구성

```text
Vite + React frontend
        │ /api
        ▼
Node.js + Express API ─── optional Responses-compatible AI (:8318)
        │
        ├── PostgreSQL
        └── KORAIL / ODCloud public-data APIs (server-side key only)
```

- 프론트엔드: Vite 7, React 19
- 백엔드: Node.js 22, Express 5
- DB: PostgreSQL 16
- 배포: Docker Compose, Nginx
- AI 게이트웨이: Responses 호환 API, 기본 모델 설정 `gpt-5.6-sol`
- 공공데이터: 철도 거리, 철도화물 운행시간표, 최저운임, 운임률, 적재시간, 화물 작업선

## Docker 실행

```bash
cp .env.example .env
docker compose up -d --build
```

- 웹: `http://localhost:4173`
- API 상태: `http://localhost:8320/health`
- PostgreSQL: `localhost:55432`

공공데이터 키와 선택적인 AI 인증정보는 로컬 `.env`에만 넣습니다. `.env`, 인증 문서, 원문 키는 Git에서 제외됩니다.

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
docker compose config
curl http://localhost:8320/health
```

`pnpm check`는 프론트 프로덕션 빌드와 백엔드 역제안 엔진 테스트를 실행합니다. Compose의 기본 웹·API 서비스는 협업 중 변경이 즉시 반영되도록 Vite HMR과 Node watch 모드로 실행되며, 루트 `Dockerfile`은 프로덕션 정적 배포 이미지를 별도로 유지합니다.

## 주요 디렉터리

```text
src/rail-logistics/       레일물류 전체 모바일 흐름
src/screens/              코레일+ 기반 화면
server/src/               API, AI, 공공데이터 연결
server/test/              역제안 엔진 테스트
db/                       PostgreSQL 스키마와 데모 데이터
deploy/                   Nginx 설정
docs/                     기반 디자인 시스템과 참고 화면
```

## 데모·운영 경계

- 해커톤 화면의 참여 물량, 회사, 비용 일부는 가상 데이터입니다.
- 실제 운임·적재 가능 여부·계약·배차·결제를 자동 확정하지 않습니다.
- 다른 화주의 회사명, 품목, 상세 주소, 운임, 담당자 정보는 공개하지 않습니다.
- 위험물 또는 특수화물은 자동 계산을 중단하고 담당자 검토로 연결합니다.
- 탄소 비교에는 철도 전후 문전 트럭 구간을 포함합니다.

코레일 및 관련 표장은 해당 권리자에게 귀속되며, 본 프로젝트는 MOVE-AI Challenge 2026 해커톤 시연용 프로토타입입니다.
