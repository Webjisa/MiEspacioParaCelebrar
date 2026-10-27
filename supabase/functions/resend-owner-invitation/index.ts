import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "npm:@supabase/server@^1";

interface ReqPayload {
  owner_id: string;
}

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    if (req.method !== "POST") {
      return Response.json(
        { error: "Método no permitido" },
        { status: 405 },
      );
    }

    try {
      const userId = ctx.userClaims?.id;

      if (!userId) {
        return Response.json(
          { error: "Usuario no autenticado." },
          { status: 401 },
        );
      }

      // Comprobar que quien realiza la operación es un administrador
      const { data: adminProfile, error: adminProfileError } =
        await ctx.supabaseAdmin
          .from("profiles")
          .select("id, role, active")
          .eq("id", userId)
          .maybeSingle();

      if (adminProfileError) {
        console.error(
          "Error comprobando administrador:",
          adminProfileError,
        );

        return Response.json(
          { error: "No se pudo comprobar el usuario administrador." },
          { status: 500 },
        );
      }

      if (
        !adminProfile ||
        adminProfile.role !== "admin" ||
        adminProfile.active !== true
      ) {
        return Response.json(
          { error: "No tienes permisos para reenviar invitaciones." },
          { status: 403 },
        );
      }

      const body: ReqPayload = await req.json();

      const ownerId = body.owner_id?.trim();

      if (!ownerId) {
        return Response.json(
          { error: "Falta el owner_id." },
          { status: 400 },
        );
      }

      // Obtener los datos del propietario existente
      const { data: ownerData, error: ownerError } =
        await ctx.supabase.rpc("admin_get_owner_invitation_data", {
          p_owner_id: ownerId,
        });

      if (ownerError) {
        console.error(
          "Error obteniendo los datos del propietario:",
          ownerError,
        );

        return Response.json(
          { error: ownerError.message },
          { status: 400 },
        );
      }

      if (!ownerData || ownerData.length === 0) {
        return Response.json(
          { error: "No se encontró el propietario." },
          { status: 404 },
        );
      }

      const owner = ownerData[0];

      if (!owner.user_id || !owner.email) {
        return Response.json(
          {
            error:
              "El propietario no tiene un usuario o email válido asociado.",
          },
          { status: 400 },
        );
      }

      // Enviar correo de recuperación al usuario existente.
      // No se crea ningún usuario nuevo.
      const { error: resetError } =
        await ctx.supabase.auth.resetPasswordForEmail(
          owner.email,
          {
            redirectTo:
              "https://webjisa.github.io/MiEspacioParaCelebrar/activar-cuenta.html",
          },
        );

      if (resetError) {
        console.error(
          "Error enviando el correo de recuperación:",
          resetError,
        );

        return Response.json(
          { error: resetError.message },
          { status: 400 },
        );
      }

      return Response.json(
        {
          success: true,
          owner_id: owner.owner_id,
          user_id: owner.user_id,
          email: owner.email,
          message: "Correo de acceso enviado correctamente.",
        },
        { status: 200 },
      );
    } catch (error) {
      console.error("Error interno:", error);

      return Response.json(
        { error: "Error interno al reenviar la invitación." },
        { status: 500 },
      );
    }
  }),
};