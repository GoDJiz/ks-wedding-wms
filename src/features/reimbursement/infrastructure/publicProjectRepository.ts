import type { SupabaseClient } from "@supabase/supabase-js";

export type PublicProjectInfo = {
  id: string;
  name: string;
  brideName: string | null;
  groomName: string | null;
};

export async function getPublicProjectInfo(
  supabase: SupabaseClient,
  projectId: string
): Promise<PublicProjectInfo | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, bride_name, groom_name")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    brideName: data.bride_name as string | null,
    groomName: data.groom_name as string | null,
  };
}
