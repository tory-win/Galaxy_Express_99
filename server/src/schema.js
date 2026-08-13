const agentSchema = `
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

alter table freight_requests alter column user_id set default 'rail-logistics-user';
update freight_requests set user_id = 'rail-logistics-user' where user_id = 'korail-demo-user';
update pool_members set member_id = 'owner-rail-logistics-user' where member_id = 'owner-korail-demo-user';
`

export async function ensureSchema(database) {
  await database.query(agentSchema)
}
