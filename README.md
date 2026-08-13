# Galaxy Express 99

물류 해커톤 제품 개발 저장소입니다. 이 저장소에는 제품 프론트엔드, 제품 API, DB 스키마와 제품 실행용 Docker 구성만 포함합니다.

팀 관리용 협업 허브와 Codex 실행기는 이 저장소 밖의 로컬 전용 control plane으로 분리하며 GitHub에 올리지 않습니다.

## 구성

- `apps/product-web`: Vite + React + TypeScript 제품 화면
- `services/product-api`: Express + PostgreSQL API 및 8318 Responses API 연동
- `db/schema.sql`: 물류 도메인 스키마와 개발 샘플 데이터
- `docker-compose.yml`: PostgreSQL, 제품 API, 제품 웹 개발 스택
- `docs/railfit-public-data.md`: KORAIL·ODCloud 공공데이터 연동 카탈로그

## 실행

```bash
cp .env.example .env
npm install
npm run dev
```

- 제품 웹: http://127.0.0.1:5173/galaxy-express/preview/
- 제품 API 상태: http://127.0.0.1:8320/health

AI 호출은 Docker에서 `host.docker.internal:8318/v1/responses`를 사용하며 키 파일은 이미지나 저장소에 포함하지 않습니다.
