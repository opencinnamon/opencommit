import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

export async function upsertUser(data: {
  github_id: number;
  github_username: string;
  github_avatar_url: string;
  github_access_token: string;
}) {
  const { error } = await supabaseAdmin
    .from("users")
    .upsert(data, { onConflict: "github_id" });
  if (error) throw error;
}
