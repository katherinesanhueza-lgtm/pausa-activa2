# Pausa Activa 2

Base del proyecto en Vue 3, JavaScript y Vite.

## Desarrollo local

Con Node.js 22.18 o 24 LTS instalado, abre una terminal en la carpeta del proyecto y ejecuta:

```sh
npm install
npm run dev
```

Abre la dirección que indique la terminal. La pantalla inicial está en `src/App.vue`.

Para verificar la compilación, ejecuta `npm run build`.

## Trabajo en equipo

Trabaja en una rama por cambio. Si cambian las dependencias, incluye los cambios de `package.json` y `package-lock.json` en el mismo commit. Con el archivo de bloqueo disponible, usa `npm ci` para instalar las mismas versiones que el resto del equipo.

## RF-02

Para este caso se hace uso de los siguientes comandos para instalación/inicialización de Supabase CLI
en la raiz del proyecto se ejecuta "npx supabase login", luego de completar este paso se ejecuta npx supabase link --project-ref TU_PROJECT_ID, el project_id corresponde al codigo de 20 letras que aparece en la url del dashboard de supabase (https://supabase.com/dashboard/project/TU_PROJECT_ID).

En caso de modificar la función, para volver a desplegarla se hace uso de "npx supabase functions deploy gestionar-usuarios --no-verify-jwt"

para efecto de prueba se hizo uso de Postman.