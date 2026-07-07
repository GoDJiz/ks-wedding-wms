"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { logErrorServer } from "@/shared/logging/logErrorServer";
import type { ActionResult } from "@/shared/lib/actionResult";
import type { ErrorCode } from "@/shared/lib/errorCodes";
import { mapSupabaseError } from "@/shared/lib/mapSupabaseError";
import type { Project } from "../domain/Project";
import { updateProjectSchema, type UpdateProjectInput } from "../project.types";
import {
  fetchProjectById,
  updateProjectRow,
} from "../infrastructure/projectRepository";

export async function getProject(
  projectId: string
): Promise<ActionResult<Project>> {
  try {
    const supabase = await createSupabaseServerClient();
    const project = await fetchProjectById(supabase, projectId);

    if (!project) {
      return { ok: false, code: "not_found" };
    }
    return { ok: true, data: project };
  } catch (err) {
    await logErrorServer({
      module: "features/project/getProject",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId,
    });
    return { ok: false, code: "unknown_error" };
  }
}

export async function updateProject(
  input: UpdateProjectInput
): Promise<ActionResult<null>> {
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    const code = (parsed.error.issues[0]?.message ??
      "invalid_input") as ErrorCode;
    return { ok: false, code };
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
      return { ok: false, code: mapSupabaseError(error) };
    }

    revalidatePath("/settings/project");
    return { ok: true, data: null };
  } catch (err) {
    await logErrorServer({
      module: "features/project/updateProject",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
      projectId: parsed.data.id,
    });
    return { ok: false, code: "unknown_error" };
  }
}
