<script setup>
// RF-08: formulario para crear o editar un ejercicio, con su video de YouTube (RF-09).
// No guarda en Supabase: emite "guardar" con los datos ya validados y la pantalla que
// lo use los convierte con aFilaEjercicio() y los guarda (cuando exista la conexión de B0).
import { computed, nextTick, reactive, ref, useId, watch } from 'vue'
import VideoYoutube from './VideoYoutube.vue'
import { CATEGORIAS, DIFICULTADES, ZONAS_CUERPO, LARGO_MAXIMO, deFilaEjercicio, validarEjercicio } from '../utils/ejercicio.js'
import { esEnlaceYoutube, segundoDelEnlace, duracionDelTramo, validarTramo } from '../utils/youtube.js'

const props = defineProps({
  // Fila de la tabla ejercicio cuando se edita; null cuando se crea uno nuevo.
  ejercicio: { type: Object, default: null },
  guardando: { type: Boolean, default: false },
  errorServidor: { type: String, default: '' },
})
const emit = defineEmits(['guardar', 'cancelar'])

const base = useId()
const idDe = campo => `${base}-${campo}`

const datos = reactive(deFilaEjercicio(props.ejercicio))
const intentoGuardar = ref(false)
const formulario = ref(null)

watch(() => props.ejercicio, fila => {
  Object.assign(datos, deFilaEjercicio(fila))
  intentoGuardar.value = false
})

const editando = computed(() => Boolean(props.ejercicio))
const errores = computed(() => validarEjercicio(datos))
// Los errores se muestran recién después del primer intento de guardar.
const visibles = computed(() => (intentoGuardar.value ? errores.value : {}))
const videoValido = computed(() => esEnlaceYoutube(datos.url_video))
const tramoValido = computed(() => validarTramo(datos.segundo_inicio, datos.segundo_termino) === null)
const duracionCalculada = computed(() => duracionDelTramo(datos.segundo_inicio, datos.segundo_termino))

// Si el enlace pegado trae un segundo (?t=...), se propone como inicio del tramo.
watch(() => datos.url_video, enlace => {
  const segundo = segundoDelEnlace(enlace)
  const inicioVacio = datos.segundo_inicio === '' || Number(datos.segundo_inicio) === 0
  if (segundo !== null && inicioVacio) datos.segundo_inicio = segundo
})

// aria-describedby con la ayuda y el error del campo, si existen.
function describe(campo, conAyuda = false) {
  const ids = []
  if (conAyuda) ids.push(idDe(`${campo}-ayuda`))
  if (visibles.value[campo]) ids.push(idDe(`${campo}-error`))
  return ids.length ? ids.join(' ') : undefined
}

async function enviar() {
  intentoGuardar.value = true
  if (Object.keys(errores.value).length) {
    await nextTick()
    formulario.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  emit('guardar', { ...datos })
}
</script>

<template>
  <form ref="formulario" class="formulario-ejercicio" novalidate @submit.prevent="enviar">
    <h2>{{ editando ? 'Editar ejercicio' : 'Nuevo ejercicio' }}</h2>

    <div class="campo">
      <label :for="idDe('nombre')">Título</label>
      <input :id="idDe('nombre')" v-model="datos.nombre" type="text" :maxlength="LARGO_MAXIMO.nombre" autocomplete="off" :aria-invalid="Boolean(visibles.nombre)" :aria-describedby="describe('nombre')">
      <p v-if="visibles.nombre" :id="idDe('nombre-error')" class="error">{{ visibles.nombre }}</p>
    </div>

    <div class="campo">
      <label :for="idDe('descripcion')">Descripción corta</label>
      <textarea :id="idDe('descripcion')" v-model="datos.descripcion" rows="2" :maxlength="LARGO_MAXIMO.descripcion" :aria-invalid="Boolean(visibles.descripcion)" :aria-describedby="describe('descripcion', true)" />
      <p :id="idDe('descripcion-ayuda')" class="ayuda">{{ datos.descripcion.length }} de {{ LARGO_MAXIMO.descripcion }} caracteres</p>
      <p v-if="visibles.descripcion" :id="idDe('descripcion-error')" class="error">{{ visibles.descripcion }}</p>
    </div>

    <fieldset class="campo" :aria-describedby="describe('dificultad')">
      <legend>Dificultad</legend>
      <div class="opciones">
        <label v-for="opcion in DIFICULTADES" :key="opcion.valor" class="opcion">
          <input v-model="datos.dificultad" type="radio" :name="idDe('dificultad')" :value="opcion.valor" :aria-invalid="Boolean(visibles.dificultad)">
          {{ opcion.texto }}
        </label>
      </div>
      <p v-if="visibles.dificultad" :id="idDe('dificultad-error')" class="error">{{ visibles.dificultad }}</p>
    </fieldset>

    <div class="fila">
      <div class="campo">
        <label :for="idDe('categoria')">Categoría</label>
        <select :id="idDe('categoria')" v-model="datos.categoria" :aria-invalid="Boolean(visibles.categoria)" :aria-describedby="describe('categoria')">
          <option value="" disabled>Elige una</option>
          <option v-for="opcion in CATEGORIAS" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
        </select>
        <p v-if="visibles.categoria" :id="idDe('categoria-error')" class="error">{{ visibles.categoria }}</p>
      </div>
      <div class="campo">
        <label :for="idDe('zona')">Zona del cuerpo</label>
        <select :id="idDe('zona')" v-model="datos.zona_cuerpo" :aria-invalid="Boolean(visibles.zona_cuerpo)" :aria-describedby="describe('zona_cuerpo')">
          <option value="" disabled>Elige una</option>
          <option v-for="opcion in ZONAS_CUERPO" :key="opcion.valor" :value="opcion.valor">{{ opcion.texto }}</option>
        </select>
        <p v-if="visibles.zona_cuerpo" :id="idDe('zona_cuerpo-error')" class="error">{{ visibles.zona_cuerpo }}</p>
      </div>
    </div>

    <div class="campo">
      <label :for="idDe('objetivo')">Objetivo</label>
      <input :id="idDe('objetivo')" v-model="datos.objetivo" type="text" :maxlength="LARGO_MAXIMO.objetivo" :aria-invalid="Boolean(visibles.objetivo)" :aria-describedby="describe('objetivo', true)">
      <p :id="idDe('objetivo-ayuda')" class="ayuda">Por ejemplo: activar el cuerpo después de estar sentados.</p>
      <p v-if="visibles.objetivo" :id="idDe('objetivo-error')" class="error">{{ visibles.objetivo }}</p>
    </div>

    <div class="campo">
      <label :for="idDe('instrucciones')">Instrucciones paso a paso <span class="opcional">(opcional)</span></label>
      <textarea :id="idDe('instrucciones')" v-model="datos.instrucciones" rows="4" :maxlength="LARGO_MAXIMO.instrucciones" :aria-invalid="Boolean(visibles.instrucciones)" :aria-describedby="describe('instrucciones', true)" />
      <p :id="idDe('instrucciones-ayuda')" class="ayuda">Escribe un paso por línea.</p>
      <p v-if="visibles.instrucciones" :id="idDe('instrucciones-error')" class="error">{{ visibles.instrucciones }}</p>
    </div>

    <fieldset class="campo grupo-video">
      <legend>Video de YouTube</legend>
      <div class="campo">
        <label :for="idDe('video')">Enlace del video</label>
        <input :id="idDe('video')" v-model="datos.url_video" type="url" inputmode="url" placeholder="https://youtu.be/…" autocomplete="off" :aria-invalid="Boolean(visibles.url_video)" :aria-describedby="describe('url_video', true)">
        <p :id="idDe('url_video-ayuda')" class="ayuda">Súbelo a YouTube como «no listado» y pega aquí el enlace.</p>
        <p v-if="visibles.url_video" :id="idDe('url_video-error')" class="error">{{ visibles.url_video }}</p>
      </div>

      <VideoYoutube
        v-if="videoValido"
        :enlace="datos.url_video"
        :titulo="datos.nombre || 'Vista previa del video'"
        :inicio="tramoValido ? datos.segundo_inicio : 0"
        :termino="tramoValido ? datos.segundo_termino : null"
      />

      <p :id="idDe('tramo-ayuda')" class="ayuda">Si el video es más largo que el ejercicio, indica desde qué segundo y hasta cuál se reproduce.</p>
      <div class="fila">
        <div class="campo">
          <label :for="idDe('inicio')">Segundo de inicio</label>
          <input :id="idDe('inicio')" v-model="datos.segundo_inicio" type="number" min="0" step="1" inputmode="numeric" :aria-invalid="Boolean(visibles.segundo_inicio)" :aria-describedby="describe('segundo_inicio', false) ?? idDe('tramo-ayuda')">
          <p v-if="visibles.segundo_inicio" :id="idDe('segundo_inicio-error')" class="error">{{ visibles.segundo_inicio }}</p>
        </div>
        <div class="campo">
          <label :for="idDe('termino')">Segundo de término <span class="opcional">(opcional)</span></label>
          <input :id="idDe('termino')" v-model="datos.segundo_termino" type="number" min="1" step="1" inputmode="numeric" :aria-invalid="Boolean(visibles.segundo_termino)" :aria-describedby="describe('segundo_termino', false) ?? idDe('tramo-ayuda')">
          <p v-if="visibles.segundo_termino" :id="idDe('segundo_termino-error')" class="error">{{ visibles.segundo_termino }}</p>
        </div>
      </div>

      <p v-if="duracionCalculada !== null" class="duracion-calculada" aria-live="polite">
        Duración: <strong>{{ duracionCalculada }} segundos</strong>, calculada con el tramo.
      </p>
      <div v-else class="campo">
        <label :for="idDe('duracion')">Duración en segundos</label>
        <input :id="idDe('duracion')" v-model="datos.duracion_segundos" type="number" min="1" step="1" inputmode="numeric" :aria-invalid="Boolean(visibles.duracion_segundos)" :aria-describedby="describe('duracion_segundos', true)">
        <p :id="idDe('duracion_segundos-ayuda')" class="ayuda">Como usas el video completo, escribe cuánto dura.</p>
        <p v-if="visibles.duracion_segundos" :id="idDe('duracion_segundos-error')" class="error">{{ visibles.duracion_segundos }}</p>
      </div>
    </fieldset>

    <p v-if="errorServidor" class="error-servidor" role="alert">{{ errorServidor }}</p>

    <div class="acciones">
      <button type="button" class="boton secundario" :disabled="guardando" @click="emit('cancelar')">Cancelar</button>
      <button type="submit" class="boton primario" :disabled="guardando">
        {{ guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Publicar ejercicio' }}
      </button>
    </div>
  </form>
</template>

<style scoped>
.formulario-ejercicio {
  display: grid;
  gap: 16px;
}
.formulario-ejercicio h2 {
  margin: 0;
}
.campo {
  display: grid;
  gap: 6px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.grupo-video {
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--color-borde, #d0d0d0);
  border-radius: 12px;
}
label,
legend {
  font-weight: 600;
}
legend {
  padding: 0 4px;
}
.opcion,
.opcional {
  font-weight: 400;
}
.opcional {
  color: var(--color-texto-suave, #555);
}
input:not([type='radio']),
select,
textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--color-borde, #8a8a8a);
  border-radius: 8px;
  font: inherit;
  background: var(--color-fondo-campo, #fff);
  color: inherit;
}
textarea {
  resize: vertical;
}
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
.boton:focus-visible {
  outline: 3px solid var(--color-foco, #ffbf47);
  outline-offset: 1px;
}
[aria-invalid='true']:not([type='radio']) {
  border-color: var(--color-error, #b3261e);
}
.fila {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.opciones {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 20px;
}
.opcion {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  cursor: pointer;
}
.ayuda {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-texto-suave, #555);
}
.error,
.error-servidor {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-error, #b3261e);
}
.error-servidor {
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-error-fondo, #fbebeb);
}
.duracion-calculada {
  margin: 0;
}
.acciones {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
}
.boton {
  min-height: 44px;
  padding: 0 20px;
  border-radius: 8px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.boton:disabled {
  opacity: 0.6;
  cursor: default;
}
.primario {
  border: 0;
  color: #fff;
  background: var(--color-primario, #1f6feb);
}
.secundario {
  border: 1px solid var(--color-borde, #8a8a8a);
  color: inherit;
  background: transparent;
}
</style>
