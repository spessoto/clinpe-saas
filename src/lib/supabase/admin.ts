import { createClient } from "@supabase/supabase-js";

import { getAdminEnv, getEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getEnv();
  const adminEnv = getAdminEnv();

  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    adminEnv.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
