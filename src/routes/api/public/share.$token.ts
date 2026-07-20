import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/share/$token")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { token } = params;
        const url = new URL(request.url);
        const providedHash = url.searchParams.get("p");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: rows, error } = await supabaseAdmin
          .from("shared_files")
          .select("id, file_id, password_hash, allow_download, expires_at, revoked_at, view_count, files(storage_path, name)")
          .eq("token", token)
          .limit(1);
        if (error) return new Response(error.message, { status: 500 });
        const share = rows?.[0] as
          | {
              id: string;
              file_id: string;
              password_hash: string | null;
              allow_download: boolean;
              expires_at: string | null;
              revoked_at: string | null;
              view_count: number;
              files: { storage_path: string; name: string } | null;
            }
          | undefined;
        if (!share || !share.files) return new Response("Not found", { status: 404 });
        if (share.revoked_at) return new Response("Revoked", { status: 410 });
        if (share.expires_at && new Date(share.expires_at) < new Date())
          return new Response("Expired", { status: 410 });

        if (share.password_hash) {
          if (!providedHash || providedHash !== share.password_hash)
            return new Response("Password required", { status: 401 });
        }

        const { data: signed, error: sErr } = await supabaseAdmin.storage
          .from("user-files")
          .createSignedUrl(share.files.storage_path, 3600, share.allow_download ? { download: share.files.name } : undefined);
        if (sErr) return new Response(sErr.message, { status: 500 });

        // best-effort view increment
        await supabaseAdmin.from("shared_files").update({ view_count: share.view_count + 1 }).eq("id", share.id);

        return Response.json({ url: signed.signedUrl });
      },
    },
  },
});
