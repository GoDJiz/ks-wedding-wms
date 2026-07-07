"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logError } from "@/application/logging/logError";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { Project } from "../domain/Project";
import { updateProjectSchema, type UpdateProjectInput } from "../project.types";
import {
  fetchProjectById,
  updateProjectRow,
} from "../infrastructure/projectRepository";

export async function getDefaultProjectId(): Promise<ActionResult<string>> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { ok: false, message: "Not signed in." };
    }

    const { data, error } = await supabase
      .from("project_members")
      .select("project_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (error || !data) {
      return { ok: false, message: "No project found for this user." };
    }

    return { ok: true, data: data.project_id as string };
  } catch (err) {
    await logError({
      module: "features/project/getDefaultProjectId",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    return {
      ok: false,
      message: "Something went wrong resolving the project.",
    };
  }
}

export async function getProject(
  projectId: string
): Promise<ActionResult<Project>> {
  try {
    const supabase = await createSupabaseServerClient();
    const project = await fetchProjectById(supabase, projectId);

    if (!project) {
      return { ok: false, message: "Project not found or access denied." };
    }
    return { ok: true, data: project };
  } catch (err) {
    await logError({
      module: "features/project/getProject",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, message: "Something went wrong loading the project." };
  }
}

export async function updateProject(
  input: UpdateProjectInput
): Promise<ActionResult<null>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await updateProjectRow(supabase, parsed.data.id, {
      name: parsed.data.name,
      brideName: parsed.data.brideName || null,
      groomName: parsed.data.groomName || null,
      weddingDate: parsed.data.weddingDate || null,
      venue: parsed.data.venue || null,
      currency: parsed.data.currency,
    });

    if (error) {
      // Likely an RLS rejection (e.g. non-owner/admin) — don't leak the raw
      // Postgres error to the UI, per Error Handling Standards.
      return {
        ok: false,
        message: "You don't have permission to update this project.",
      };
    }

    revalidatePath("/settings/project");
    return { ok: true, data: null };
  } catch (err) {
    await logError({
      module: "features/project/updateProject",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.id,
    });
    return { ok: false, message: "Something went wrong saving the project." };
  }
}
