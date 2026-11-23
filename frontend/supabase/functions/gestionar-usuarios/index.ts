import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Falta cabecera de autorización" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: "Sesión inválida o expirada" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("perfiles")
      .select("id, rol, id_colegio, activo")
      .eq("id", caller.id)
      .single();

    if (profileError || !callerProfile || !callerProfile.activo) {
      return new Response(JSON.stringify({ error: "Usuario sin perfil activo" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const esAdmin = callerProfile.rol === "admin";
    const esColegio = callerProfile.rol === "colegio";

    if (!esAdmin && !esColegio) {
      return new Response(JSON.stringify({ error: "No tienes permisos para gestionar cuentas" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = await req.json();
    const { accion } = body;

    if (accion === "crear_usuario") {
      const { correo, password, nombre, apellido, rol, id_colegio, puede_crear_contenido } = body;

      if (!correo || !password || !nombre || !apellido || !rol) {
        return new Response(JSON.stringify({ error: "Faltan campos obligatorios" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let rolFinal = rol;
      let colegioFinal = id_colegio ?? null;
      let permisoFinal = Boolean(puede_crear_contenido);

      if (esColegio) {
        if (rol !== "docente") {
          return new Response(JSON.stringify({ error: "Un colegio solo puede crear cuentas de docente" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        rolFinal = "docente";
        colegioFinal = callerProfile.id_colegio;
        permisoFinal = false;
      }

      const { data: authData, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: correo,
        password: password,
        email_confirm: true,
      });

      if (createAuthError || !authData.user) {
        return new Response(JSON.stringify({ error: createAuthError?.message || "Error al crear usuario en Auth" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: nuevoPerfil, error: insertProfileError } = await supabaseAdmin
        .from("perfiles")
        .insert({
          id: authData.user.id,
          id_colegio: colegioFinal,
          rol: rolFinal,
          nombre,
          apellido,
          correo,
          activo: true,
          puede_crear_contenido: permisoFinal,
        })
        .select()
        .single();

      if (insertProfileError) {
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: insertProfileError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Usuario creado correctamente", perfil: nuevoPerfil }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (accion === "reset_password") {
      if (!esAdmin) {
        return new Response(JSON.stringify({ error: "Solo el administrador puede restablecer contraseñas" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { user_id, nueva_password } = body;
      if (!user_id || !nueva_password || nueva_password.length < 6) {
        return new Response(JSON.stringify({ error: "ID de usuario o contraseña inválida (mínimo 6 caracteres)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: resetError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        password: nueva_password,
      });

      if (resetError) {
        return new Response(JSON.stringify({ error: resetError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: "Contraseña actualizada correctamente" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (accion === "cambiar_estado") {
      if (!esAdmin) {
        return new Response(JSON.stringify({ error: "Solo el administrador puede activar o desactivar cuentas" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { user_id, activo } = body;
      if (!user_id || typeof activo !== "boolean") {
        return new Response(JSON.stringify({ error: "Parámetros user_id y activo (boolean) requeridos" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
        ban_duration: activo ? "none" : "876000h", 
      });

      if (banError) {
        return new Response(JSON.stringify({ error: banError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateError } = await supabaseAdmin
        .from("perfiles")
        .update({ activo })
        .eq("id", user_id);

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ message: activo ? "Cuenta reactivada" : "Cuenta desactivada" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Acción no reconocida" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Error interno del servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});