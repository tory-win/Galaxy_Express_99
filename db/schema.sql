CREATE TABLE IF NOT EXISTS ai_usage_daily (
  usage_date date PRIMARY KEY,
  request_count integer NOT NULL DEFAULT 0,
  input_tokens bigint NOT NULL DEFAULT 0,
  output_tokens bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_facilities (
  id uuid PRIMARY KEY,
  code varchar(24) UNIQUE NOT NULL,
  name varchar(120) NOT NULL,
  facility_type varchar(24) NOT NULL,
  region varchar(80) NOT NULL,
  utilization numeric(5,2) NOT NULL CHECK (utilization BETWEEN 0 AND 100),
  status varchar(20) NOT NULL CHECK (status IN ('normal', 'watch', 'critical')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_shipments (
  id uuid PRIMARY KEY,
  tracking_code varchar(40) UNIQUE NOT NULL,
  origin_code varchar(24) NOT NULL,
  destination_code varchar(24) NOT NULL,
  cargo_type varchar(80) NOT NULL,
  status varchar(24) NOT NULL CHECK (status IN ('planned', 'in_transit', 'delayed', 'delivered')),
  progress smallint NOT NULL CHECK (progress BETWEEN 0 AND 100),
  eta timestamptz NOT NULL,
  delay_minutes integer NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS logistics_alerts (
  id uuid PRIMARY KEY,
  severity varchar(16) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title varchar(160) NOT NULL,
  description text NOT NULL,
  source varchar(80) NOT NULL,
  status varchar(16) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

INSERT INTO logistics_facilities (id, code, name, facility_type, region, utilization, status)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'SEL-01', '서울 도심 허브', 'hub', '서울', 82.4, 'watch'),
  ('22222222-2222-4222-8222-222222222222', 'ICN-01', '인천 게이트웨이', 'gateway', '인천', 67.8, 'normal'),
  ('33333333-3333-4333-8333-333333333333', 'BSN-01', '부산 풀필먼트', 'fulfillment', '부산', 91.2, 'critical')
ON CONFLICT (id) DO NOTHING;
INSERT INTO logistics_shipments
  (id, tracking_code, origin_code, destination_code, cargo_type, status, progress, eta, delay_minutes)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'GX99-0813-001', 'ICN-01', 'SEL-01', '신선식품', 'in_transit', 68, now() + interval '2 hours 10 minutes', 0),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'GX99-0813-002', 'BSN-01', 'SEL-01', '생활용품', 'delayed', 42, now() + interval '6 hours 40 minutes', 55),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'GX99-0813-003', 'SEL-01', 'ICN-01', '의약품', 'in_transit', 83, now() + interval '1 hour 20 minutes', 0),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'GX99-0813-004', 'ICN-01', 'BSN-01', '전자기기', 'planned', 8, now() + interval '12 hours', 0)
ON CONFLICT (id) DO NOTHING;

INSERT INTO logistics_alerts (id, severity, title, description, source)
VALUES
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1', 'critical', '부산 허브 임계 용량 접근', '현재 적재율이 90%를 넘어 우회 배차 검토가 필요합니다.', 'BSN-01'),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2', 'warning', 'GX99-0813-002 지연', '예상보다 55분 지연되어 도착 순서 재조정이 필요합니다.', 'GX99-0813-002')
ON CONFLICT (id) DO NOTHING;
