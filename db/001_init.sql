create sequence if not exists request_number_seq start with 1;
create sequence if not exists review_number_seq start with 1;

create table if not exists freight_requests (
  id text primary key,
  user_id text not null default 'rail-logistics-user',
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

create table if not exists shipper_agents (
  id text primary key,
  display_name text not null,
  region text not null,
  cargo_type text not null,
  strategy text not null,
  container_id text,
  status text not null default 'online' check (status in ('online', 'offline', 'degraded')),
  cycle integer not null default 0,
  last_action text,
  payload jsonb not null default '{}'::jsonb,
  registered_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists pool_members (
  request_id text not null references freight_requests(id) on delete cascade,
  member_id text not null,
  agent_id text references shipper_agents(id) on delete cascade,
  display_name text not null,
  region text not null,
  teu numeric(8,2) not null check (teu > 0),
  status text not null default 'confirmed' check (status in ('confirmed', 'checking')),
  is_owner boolean not null default false,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_id, member_id),
  unique (request_id, agent_id)
);

create table if not exists agent_events (
  id uuid primary key,
  agent_id text not null references shipper_agents(id) on delete cascade,
  event_type text not null,
  request_id text references freight_requests(id) on delete set null,
  idempotency_key text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (agent_id, idempotency_key)
);

create index if not exists shipper_agents_last_seen_idx on shipper_agents(last_seen_at desc);
create index if not exists agent_events_created_at_idx on agent_events(created_at desc);
create index if not exists pool_members_request_idx on pool_members(request_id, joined_at);

insert into data_source_registry (dataset_id, name, base_url) values
  ('15153835/v1', '철도 거리 정보', 'https://api.odcloud.kr/api/15153835/v1/uddi:f49e02cd-6a65-423e-b773-ddf649267d92'),
  ('15042241/v1', '철도화물 운행시간표', 'https://api.odcloud.kr/api/15042241/v1/uddi:7545f0f5-1ae2-4b41-bc1d-de4a011972eb'),
  ('15153539/v1', '화물 최저운임', 'https://api.odcloud.kr/api/15153539/v1/uddi:69cf6c1d-fbff-4981-a65d-b9e197e14911'),
  ('15153571/v1', '철도화물 운임률', 'https://api.odcloud.kr/api/15153571/v1/uddi:8b1350c1-711c-422a-b68d-e4e27ed31509'),
  ('15153575/v1', '화물 적재시간', 'https://api.odcloud.kr/api/15153575/v1/uddi:106d1522-6c05-4f5a-b95d-9fe4c9453361'),
  ('15153559/v1', '화물 작업선', 'https://api.odcloud.kr/api/15153559/v1/uddi:a369ea3f-6493-441a-9a5d-b4da591cbeb3')
on conflict (dataset_id) do nothing;
