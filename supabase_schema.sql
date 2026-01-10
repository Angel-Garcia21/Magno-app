-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
-- Stores user information extending the built-in auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  role text check (role in ('owner', 'tenant', 'admin', 'guest')) default 'guest',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on profiles for select
  using ( true );

create policy "Users can insert their own profile"
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile"
  on profiles for update
  using ( auth.uid() = id );

-- PROPERTIES TABLE
create table public.properties (
  id uuid default gen_random_uuid() primary key,
  ref text,
  title text not null,
  address text,
  description text,
  price numeric,
  main_image text,
  images text[], -- Array of image URLs
  owner_id uuid references public.profiles(id),
  tenant_id uuid references public.profiles(id),
  status text default 'available',
  
  -- JSONB columns for flexible data
  specs jsonb default '{}'::jsonb,
  features text[] default '{}',
  services text[] default '{}',
  amenities text[] default '{}',
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.properties enable row level security;

create policy "Properties are viewable by everyone"
  on properties for select
  using ( true );

create policy "Admins and Owners can insert properties"
  on properties for insert
  with check ( 
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and role in ('admin', 'owner')
    )
  );

create policy "Admins and Owners can update properties"
  on properties for update
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and (role = 'admin' or id = properties.owner_id)
    )
  );

-- TIMELINE TABLE
create table public.timeline_events (
  id uuid default gen_random_uuid() primary key,
  property_id uuid references public.properties(id),
  title text not null,
  description text,
  status text default 'pending',
  date timestamp with time zone default timezone('utc'::text, now()),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.timeline_events enable row level security;

create policy "Timeline viewable by everyone"
  on timeline_events for select
  using ( true );
