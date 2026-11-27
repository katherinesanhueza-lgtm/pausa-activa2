-- ============================================================================
-- RF-15: SOLO EL ADMINISTRADOR RETIRA O RESTAURA EJERCICIOS
-- PROPUESTA para revisar con Julian. Todavía NO se ha ejecutado en Supabase
-- ni se ha probado contra la base. Se corre una vez en el SQL Editor,
-- después de schema_V3.sql.
-- ============================================================================
-- Problema: la política "Editar ejercicios propios o admin" deja que el dueño
-- cambie cualquier columna de su ejercicio, también "estado". Así un docente
-- podría volver a poner 'activo' un ejercicio que el administrador retiró.
-- Las políticas RLS controlan filas, no columnas; por eso se usa un trigger.
--
-- Solo bloquea a usuarios con sesión (rol "authenticated") que no son admin.
-- La Edge Function (service_role) y el SQL Editor (postgres) no se bloquean.

CREATE OR REPLACE FUNCTION public.proteger_estado_ejercicio()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado IS DISTINCT FROM OLD.estado
     AND current_user = 'authenticated'
     AND NOT public.es_admin() THEN
    -- 42501 = sin permiso: Supabase lo devuelve a Vue como error 403.
    RAISE EXCEPTION 'Solo el administrador puede retirar o restaurar ejercicios'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_estado_ejercicio ON public.ejercicio;
CREATE TRIGGER trg_proteger_estado_ejercicio
  BEFORE UPDATE OF estado ON public.ejercicio
  FOR EACH ROW EXECUTE FUNCTION public.proteger_estado_ejercicio();

-- ----------------------------------------------------------------------------
-- Prueba en el SQL Editor (no deja cambios gracias al ROLLBACK).
-- Reemplazar ID-DEL-DOCENTE y el id_ejercicio por uno del docente.
-- ----------------------------------------------------------------------------
-- BEGIN;
-- SET LOCAL ROLE authenticated;
-- SET LOCAL request.jwt.claims = '{"sub":"ID-DEL-DOCENTE","role":"authenticated"}';
-- UPDATE public.ejercicio SET estado = 'retirado' WHERE id_ejercicio = 1;
-- -- Debe fallar con: Solo el administrador puede retirar o restaurar ejercicios
-- ROLLBACK;
--
-- Pendiente para RF-16: lo mismo para rutina.estado ('retirada').
