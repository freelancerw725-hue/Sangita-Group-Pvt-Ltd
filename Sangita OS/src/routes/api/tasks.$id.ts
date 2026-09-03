import { createFileRoute } from "@tanstack/react-router";
import { getTaskById, updateTask, deleteTask } from "@/lib/supabase/services/tasks";
import { json, errorJson } from "@/lib/keywords/api-auth";

export const Route = createFileRoute("/api/tasks/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          const task = await getTaskById(id);
          if (!task) return errorJson("Task not found", 404);
          return json({ task });
        } catch (e) {
          console.error("[tasks/$id GET]", e);
          return errorJson("Failed to fetch task", 500);
        }
      },
      PATCH: async ({ request, params }) => {
        try {
          const id = (params as { id: string }).id;
          const body = await request.json().catch(() => null);
          if (!body) return errorJson("Invalid JSON", 400);

          const task = await updateTask(id, body);
          return json({ task });
        } catch (e) {
          console.error("[tasks/$id PATCH]", e);
          return errorJson("Failed to update task", 500);
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = (params as { id: string }).id;
          await deleteTask(id);
          return json({ success: true });
        } catch (e) {
          console.error("[tasks/$id DELETE]", e);
          return errorJson("Failed to delete task", 500);
        }
      },
    },
  },
});
