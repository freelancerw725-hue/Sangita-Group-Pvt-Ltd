import { createFileRoute } from "@tanstack/react-router";
import { getProjectById, updateProject, deleteProject } from "@/lib/supabase/services/projects";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/projects/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const project = await getProjectById(id);
          if (!project) return errorJson("Project not found", 404);
          return json({ project });
        } catch (e) {
          console.error("[projects/$id GET]", e);
          return errorJson("Failed to fetch project", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const project = await updateProject(id, body);
          return json({ project });
        } catch (e) {
          console.error("[projects/$id PATCH]", e);
          return errorJson("Failed to update project", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteProject(id);
          return json({ success: true });
        } catch (e) {
          console.error("[projects/$id DELETE]", e);
          return errorJson("Failed to delete project", 500);
        }
      },
    },
  },
});
