create table trackpoints (
  id bigint generated always as identity primary key,
  time bigint not null unique,
  lat double precision not null,
  lon double precision not null,
  altitude double precision,
  speed double precision,
  heading double precision,
  on_ground boolean not null default false,
  created_at timestamptz not null default now()
);

create index idx_trackpoints_time on trackpoints (time);

alter table trackpoints enable row level security;

-- The app only talks to Supabase from the server using the service_role key,
-- which bypasses RLS entirely, so no policies are needed for it to work.
-- This just keeps the table locked down from the public/anon key by default.
