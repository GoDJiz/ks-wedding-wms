import type { SupabaseClient } from "@supabase/supabase-js";
import type { Project } from "../domain/Project";

type ProjectRow = {
  id: string;
  name: string;
  bride_name: string | null;
  groom_name: string | null;
  wedding_date: string | null;
  venue: string | null;
  logo_url: string | null;
  currency: string;
  default_language: string;
  created_at: string;
};

function toDomain(row: ProjectRow): Project {
  return {
    id: row.id,
    name: row.name,
    brideName: row.bride_name,
    groomName: row.groom_name,
    weddingDate: row.wedding_date,
    venue: row.venue,
    logoUrl: row.logo_url,
    currency: row.currency,
    defaultLanguage: row.default_language === "en" ? "en" : "th",
    createdAt: row.created_at,
  };
}

export async function fetchProjectById(
  supabase: SupabaseClient,
  projectId: string
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error || !data) return null;
  return toDomain(data as ProjectRow);
}

export async function updateProjectRow(
  supabase: SupabaseClient,
  projectId: string,
  fields: {
    name: string;
    brideName: string | null;
    groomName: string | null;
    weddingDate: string | null;
    venue: string | null;
    currency: string;
  }
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from("projects")
    .update({
      name: fields.name,
      bride_name: fields.brideName,
      groom_name: fields.groomName,
      wedding_date: fields.weddingDate,
      venue: fields.venue,
      currency: fields.currency,
    })
    .eq("id", projectId);

  return { error: error?.message ?? null };
}
