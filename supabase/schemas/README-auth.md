Auth-related schema files
=========================

Files:
- `auth_profiles.sql` — creates `public.profiles`, `public.user_settings`, and trigger functions to sync `auth.users` -> `public.profiles`.

How to apply
------------

If you run Supabase locally, Postgres is typically reachable at `localhost:54322` (verify your `supabase/config.toml`). Use one of these commands from the repository root:

PS (PowerShell):
```powershell
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/schemas/auth_profiles.sql
```

Linux / WSL:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f supabase/schemas/auth_profiles.sql
```

Or execute the file inside the running Postgres container (example container name may differ):
```bash
docker exec -i supabase_db_1 psql -U postgres -d postgres -f /workspace/supabase/schemas/auth_profiles.sql
```

Verification
------------
After applying the SQL:

```sql
select count(*) from public.profiles;
select * from public.user_settings limit 5;
```

Notes
-----
- `auth.users` is managed by Supabase Auth; our triggers listen for inserts/updates and maintain a `public.profiles` record for convenience and richer metadata.
- Do not expose service_role keys to the frontend. The server should use an admin/service key for any privileged operations.
