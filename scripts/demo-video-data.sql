\set ON_ERROR_STOP on

begin;

delete from freight_requests where id = 'R-DEMO-VIDEO';

insert into freight_requests (
  id, user_id, origin, destination, container_size, container_count, teu,
  departure_date, deadline_at, hazardous, road_cost, status, payload,
  created_at, updated_at
) values (
  'R-DEMO-VIDEO',
  'rail-logistics-user',
  '서화성',
  '부산신항',
  '20ft',
  4,
  4,
  '2026-08-18',
  '2026-08-20T09:00:00+09:00',
  false,
  3120000,
  'proposal_ready',
  $json${
    "origin": "서화성",
    "originLabel": "서화성 화물역",
    "destination": "부산신항",
    "destinationLabel": "부산신항",
    "containerSize": "20ft",
    "containerCount": 4,
    "teu": 4,
    "quantity": "20ft × 4 · 4TEU",
    "departureDate": "2026-08-18",
    "departureLabel": "8월 18일(화)",
    "deadline": "2026-08-20T09:00",
    "deadlineLabel": "8월 20일(목) 09:00",
    "hazardous": "no",
    "roadCost": 3120000,
    "currentMode": "road",
    "weightTons": 12,
    "cargo": "산업용 부품",
    "contact": "등록된 물류 담당자 연락처",
    "axes": {
      "departure": "±1일",
      "deadline": "~4시간",
      "station": "30km 이내",
      "split": "불가",
      "rollover": "일부 가능",
      "carrier": "기존 유지",
      "storage": "1일"
    }
  }$json$::jsonb,
  '2026-08-13T15:48:00+09:00',
  '2026-08-13T15:51:00+09:00'
);

insert into proposals (id, request_id, type, rank, payload, created_at, updated_at) values
(
  'R-DEMO-VIDEO-P1',
  'R-DEMO-VIDEO',
  '날짜 조정 제안',
  1,
  $json${
    "id": "R-DEMO-VIDEO-P1",
    "engineVersion": 5,
    "type": "날짜 조정 제안",
    "title": "출발을 8월 19일(수)로 하루 옮겨보세요",
    "summary": "같은 목적지 화주 4곳과 물량을 맞추면 전체 비용이 예상 기준 약 18% 낮아집니다.",
    "recommended": true,
    "exactMatch": false,
    "before": "8월 18일(화) 출발 · 도로 운송",
    "after": "8월 19일(수) 출발 · 철도 함께 보내기",
    "cost": 2560000,
    "savings": 560000,
    "savingsRate": 18,
    "duration": "35시간",
    "timeDelta": "+4시간",
    "departure": "8월 19일(수)",
    "arrival": "8월 20일(목) 13:00",
    "station": "서화성 → 부산신항",
    "deadlineMet": true,
    "deadlineDeltaLabel": "도착 마감 준수",
    "pooledTeu": 15,
    "targetTeu": 18,
    "matchingAgents": 4,
    "matchingTeu": 11,
    "carbonTons": 0.18,
    "carbonSavings": 0.3,
    "carbonRate": 62,
    "reason": "현재 같은 목적지 화주 4곳의 11TEU가 연결되어 있어 목표 물량을 구성할 수 있습니다.",
    "gains": "전체 비용 56만원 절감 · 탄소 약 0.3톤 절감",
    "tradeoff": "출발 하루 지연 · 도착 4시간 지연",
    "caution": "함께 가는 참여사가 빠지면 조건이 바뀔 수 있습니다.",
    "trustSummary": "값 8개 중 3개가 예상값입니다",
    "confidence": ["철도 시간표 확인 완료", "트럭비 예상값", "함께 갈 물량 예상값"],
    "axes": ["출발일 ±1일", "도착 마감 ~4시간"],
    "breakdown": [
      ["공장→역 트럭비", 490000, "예상값"],
      ["상하차비", 230000, "예상값"],
      ["철도운임", 1540000, "확인 필요"],
      ["역→목적지 트럭비", 300000, "예상값"],
      ["대기·보관비", 0, "확인 완료"]
    ]
  }$json$::jsonb,
  '2026-08-13T15:49:00+09:00',
  '2026-08-13T15:51:00+09:00'
),
(
  'R-DEMO-VIDEO-P2',
  'R-DEMO-VIDEO',
  '화차 채움 최적화',
  2,
  $json${
    "id": "R-DEMO-VIDEO-P2",
    "engineVersion": 5,
    "type": "화차 채움 최적화",
    "title": "같은 회차 화물 14TEU를 모아보세요",
    "summary": "연결된 11TEU 중 같은 회차 물량을 채우면 1TEU당 비용이 예상 기준 약 22% 낮아집니다.",
    "recommended": false,
    "exactMatch": false,
    "before": "단독 배정 · 화차 단위 손실",
    "after": "같은 목적지 화주 4곳과 목표 물량 구성",
    "cost": 2430000,
    "savings": 690000,
    "savingsRate": 22,
    "duration": "37시간",
    "timeDelta": "+6시간",
    "departure": "8월 19일(수)",
    "arrival": "8월 20일(목) 15:00",
    "station": "오봉 → 부산신항",
    "deadlineMet": false,
    "deadlineDeltaLabel": "도착 마감 2시간 초과",
    "pooledTeu": 15,
    "targetTeu": 18,
    "matchingAgents": 4,
    "matchingTeu": 11,
    "carbonTons": 0.18,
    "carbonSavings": 0.3,
    "carbonRate": 63,
    "reason": "현재 같은 목적지 화주 4곳의 11TEU가 연결되어 있어 목표 물량을 구성할 수 있습니다.",
    "gains": "전체 비용 69만원 절감 · 1TEU당 단가 하락",
    "tradeoff": "도착 마감 2시간 초과 · 오봉역 이용",
    "caution": "화차 단위와 최종 운임은 코레일 담당자 확인이 필요합니다.",
    "trustSummary": "값 8개 중 4개가 예상값입니다",
    "confidence": ["철도 시간표 확인 완료", "최종 운임 확인 필요", "모집 가능성 예상값"],
    "axes": ["이용 화물역 30km", "보관 여유 1일"],
    "breakdown": [
      ["공장→역 트럭비", 560000, "예상값"],
      ["상하차비", 220000, "예상값"],
      ["철도운임", 1310000, "확인 필요"],
      ["역→목적지 트럭비", 340000, "예상값"],
      ["대기·보관비", 0, "확인 완료"]
    ]
  }$json$::jsonb,
  '2026-08-13T15:49:00+09:00',
  '2026-08-13T15:51:00+09:00'
);

insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status, updated_at)
values ('R-DEMO-VIDEO', 15, 18, 640000, 'pooling', '2026-08-13T15:51:00+09:00');

insert into pool_members (request_id, member_id, agent_id, display_name, region, teu, status, is_owner, joined_at, updated_at) values
  ('R-DEMO-VIDEO', 'owner-rail-logistics-user', null, '내 화물', '충남권', 4, 'confirmed', true, '2026-08-13T15:45:00+09:00', '2026-08-13T15:51:00+09:00'),
  ('R-DEMO-VIDEO', 'demo-video-02', 'shipper-02', '화주 02', '수도권', 4, 'confirmed', false, '2026-08-13T15:46:00+09:00', '2026-08-13T15:51:00+09:00'),
  ('R-DEMO-VIDEO', 'demo-video-03', 'shipper-03', '화주 03', '충북권', 4, 'confirmed', false, '2026-08-13T15:47:00+09:00', '2026-08-13T15:51:00+09:00'),
  ('R-DEMO-VIDEO', 'demo-video-04', 'shipper-04', '화주 04', '영남권', 3, 'confirmed', false, '2026-08-13T15:48:00+09:00', '2026-08-13T15:51:00+09:00');

commit;
