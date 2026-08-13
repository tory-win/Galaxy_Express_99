# RailFit 철도물류 공공데이터 연동 기준

기준일: 2026-08-13

이 문서는 제품 개발에 필요한 공개 메타데이터만 정리합니다. 실제 공공데이터포털 인증키는 문서, 소스코드, 브라우저, 로그, Git 저장소에 복사하지 않습니다.

## 연결 구조

```text
product-web -> product-api -> RailFit server adapter -> KORAIL / ODCloud
```

- 인증은 항상 `product-api` 서버에서 처리합니다.
- 프론트엔드에는 인증키와 인증키가 포함된 완성 URL을 전달하지 않습니다.
- 서버 설정 이름은 `KORAIL_API_KEY_FILE`을 우선 사용하고, 운영 시 secret file로 주입합니다.
- HTTP 클라이언트가 쿼리를 인코딩하는 경우 원문 키를 사용하며, URL 인코딩된 키를 다시 인코딩하지 않습니다.
- 요청 URL과 오류 로그에서는 `serviceKey` 및 `Authorization` 값을 마스킹합니다.
- 응답에는 출처, 조회 시각, 데이터 기준일과 샘플·대체 여부를 함께 표시합니다.

## 기본 연결

| 구분 | 주소 | 용도 |
| --- | --- | --- |
| KORAIL 실행 API | `https://apis.data.go.kr/B551457/run/v2` | 철도 운행 API |
| ODCloud | `https://api.odcloud.kr/api` | 철도물류 파일데이터 API |
| UNI-PASS | `https://unipass.customs.go.kr/csp/index.do` | 통관진행정보 웹 조회만 확보됨 |

UNI-PASS는 현재 API 인증정보가 없으므로 자동 연동 대상으로 간주하지 않습니다.

## ODCloud 허용 목록

모든 항목은 같은 공공데이터포털 일반 인증키를 사용하며, `Authorization` 헤더 또는 `serviceKey` 쿼리 인증을 지원합니다.

| 식별자 | 데이터 | 공식 리소스 경로 | 주요 활용 |
| --- | --- | --- | --- |
| `rail-distance` | 역간 최단거리 | `/15153835/v1/uddi:f49e02cd-6a65-423e-b773-ddf649267d92` | 출발·도착역별 화물운행거리와 경로 |
| `freight-timetable` | 화물열차 운행시간표 | `/15042241/v1/uddi:7545f0f5-1ae2-4b41-bc1d-de4a011972eb` | 열차번호, 역, 도착·출발시각, 운행요일 |
| `minimum-fare` | 화물 최저운임 | `/15153539/v1/uddi:69cf6c1d-fbff-4981-a65d-b9e197e14911` | 운임 유형별 적용 최저운임 |
| `freight-rate` | 철도화물 임율 | `/15153571/v1/uddi:8b1350c1-711c-422a-b68d-e4e27ed31509` | 톤·거리·컨테이너 기준 임율 |
| `loading-time` | 화물 적하시간 | `/15153575/v1/uddi:106d1522-6c05-4f5a-b95d-9fe4c9453361` | 화물 분류별 표준 작업시간 |
| `loading-track` | 화물 적하작업선 | `/15153559/v1/uddi:a369ea3f-6493-441a-9a5d-b4da591cbeb3` | 역별 작업선, 거리, 할인·할증, 폐선 여부 |

## 구현 순서

1. `product-api`에 서버 전용 RailFit 어댑터와 허용 목록을 추가합니다.
2. 페이지 크기, 타임아웃, 재시도, 일일 호출량을 제한합니다.
3. 역간거리와 시간표를 먼저 연결해 운송 후보 경로를 만듭니다.
4. 최저운임·임율·적하시간을 조합해 비용과 처리시간을 계산합니다.
5. 작업선 정보로 실제 취급 가능 여부를 검증합니다.
6. 원천 응답은 정규화하고 기준일이 지난 값은 화면에서 명시합니다.

## 공식 Swagger

- <https://infuser.odcloud.kr/oas/docs?namespace=15153835%2Fv1>
- <https://infuser.odcloud.kr/oas/docs?namespace=15042241%2Fv1>
- <https://infuser.odcloud.kr/oas/docs?namespace=15153539%2Fv1>
- <https://infuser.odcloud.kr/oas/docs?namespace=15153571%2Fv1>
- <https://infuser.odcloud.kr/oas/docs?namespace=15153575%2Fv1>
- <https://infuser.odcloud.kr/oas/docs?namespace=15153559%2Fv1>
