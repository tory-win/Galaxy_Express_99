create sequence if not exists request_number_seq start with 115;
create sequence if not exists review_number_seq start with 42;

create table if not exists freight_requests (
  id text primary key,
  user_id text not null default 'korail-demo-user',
  origin text not null,
  destination text not null,
  container_size text not null,
  container_count integer not null check (container_count > 0),
  teu numeric(8,2) not null check (teu > 0),
  departure_date date not null,
  deadline_at timestamptz not null,
  hazardous boolean not null default false,
  road_cost bigint,
  status text not null default 'draft',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposals (
  id text primary key,
  request_id text not null references freight_requests(id) on delete cascade,
  type text not null,
  rank integer not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposal_decisions (
  id uuid primary key,
  request_id text not null references freight_requests(id) on delete cascade,
  proposal_id text not null,
  decision text not null check (decision in ('accepted', 'rejected')),
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists pool_summaries (
  request_id text primary key references freight_requests(id) on delete cascade,
  current_teu numeric(8,2) not null,
  target_teu numeric(8,2) not null,
  unit_cost bigint,
  status text not null,
  updated_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key,
  request_id text not null references freight_requests(id) on delete cascade,
  type text not null,
  title text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists review_requests (
  id text primary key,
  request_id text not null unique references freight_requests(id) on delete cascade,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists data_source_registry (
  dataset_id text primary key,
  name text not null,
  base_url text not null,
  trust_level text not null default 'confirmed_public_source',
  last_checked_at timestamptz
);

insert into data_source_registry (dataset_id, name, base_url) values
  ('15153835/v1', '철도 거리 정보', 'https://api.odcloud.kr/api/15153835/v1/uddi:f49e02cd-6a65-423e-b773-ddf649267d92'),
  ('15042241/v1', '철도화물 운행시간표', 'https://api.odcloud.kr/api/15042241/v1/uddi:7545f0f5-1ae2-4b41-bc1d-de4a011972eb'),
  ('15153539/v1', '화물 최저운임', 'https://api.odcloud.kr/api/15153539/v1/uddi:69cf6c1d-fbff-4981-a65d-b9e197e14911'),
  ('15153571/v1', '철도화물 운임률', 'https://api.odcloud.kr/api/15153571/v1/uddi:8b1350c1-711c-422a-b68d-e4e27ed31509'),
  ('15153575/v1', '화물 적재시간', 'https://api.odcloud.kr/api/15153575/v1/uddi:106d1522-6c05-4f5a-b95d-9fe4c9453361'),
  ('15153559/v1', '화물 작업선', 'https://api.odcloud.kr/api/15153559/v1/uddi:a369ea3f-6493-441a-9a5d-b4da591cbeb3')
on conflict (dataset_id) do nothing;

insert into freight_requests
  (id, origin, destination, container_size, container_count, teu, departure_date, deadline_at, hazardous, road_cost, status, payload)
values
  (
    'R-2026-0114', '충남 서북부', '부산신항', '20ft', 4, 4, '2026-08-18', '2026-08-20T09:00:00+09:00', false, 3120000, 'proposal_ready',
    '{"originLabel":"충남 서북부","destinationLabel":"부산신항","quantity":"20ft × 4 · 4TEU","departureLabel":"8월 18일(화)","statusLabel":"역제안 도착 · 2건","updatedAt":"방금 전"}'::jsonb
  ),
  (
    'R-2026-0108', '충남 서북부', '부산신항', '20ft', 4, 4, '2026-08-19', '2026-08-20T13:00:00+09:00', false, 2560000, 'pooling',
    '{"originLabel":"충남 서북부","destinationLabel":"부산신항","quantity":"20ft × 4 · 4TEU","departureLabel":"8월 19일(수)","statusLabel":"함께 보내기 · 15/18TEU","updatedAt":"12분 전"}'::jsonb
  )
on conflict (id) do nothing;

insert into pool_summaries (request_id, current_teu, target_teu, unit_cost, status)
values ('R-2026-0108', 15, 18, 640000, 'pooling')
on conflict (request_id) do nothing;
