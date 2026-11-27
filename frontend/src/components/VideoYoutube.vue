<script setup>
// RF-09: muestra un video de YouTube. Primero solo la miniatura y el video se carga
// al hacer clic (RNF-04: las listas no cargan videos). Si viene un tramo,
// reproduce solo desde "inicio" hasta "termino".
import { computed, ref, watch } from 'vue'
import { obtenerIdYoutube, urlMiniatura, urlIncrustada, formatearSegundos } from '../utils/youtube.js'

const props = defineProps({
  enlace: { type: String, required: true },
  titulo: { type: String, default: 'Video del ejercicio' },
  inicio: { type: [Number, String], default: 0 },
  termino: { type: [Number, String], default: null },
  // En el modo clase el video puede empezar sin mostrar antes la miniatura.
  reproducirAlCargar: { type: Boolean, default: false },
})
const emit = defineEmits(['reproducir'])

const id = computed(() => obtenerIdYoutube(props.enlace))
const reproduciendo = ref(props.reproducirAlCargar)
const tieneTramo = computed(() => props.termino !== null && props.termino !== '')
const textoTramo = computed(() => `${formatearSegundos(props.inicio)} – ${formatearSegundos(props.termino)}`)
const direccionVideo = computed(() => urlIncrustada(id.value, { inicio: props.inicio, termino: props.termino, autoplay: true }))

// Si cambia el video (por ejemplo, el siguiente ejercicio), se vuelve a la miniatura.
watch(() => props.enlace, () => { reproduciendo.value = props.reproducirAlCargar })

function reproducir() {
  reproduciendo.value = true
  emit('reproducir')
}
</script>

<template>
  <div class="video-youtube">
    <p v-if="!id" class="video-error" role="alert">El enlace no es un video válido de YouTube.</p>
    <iframe
      v-else-if="reproduciendo"
      :src="direccionVideo"
      :title="titulo"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      referrerpolicy="strict-origin-when-cross-origin"
      allowfullscreen
    />
    <button v-else type="button" class="video-portada" :aria-label="`Reproducir: ${titulo}`" @click="reproducir">
      <img :src="urlMiniatura(id)" alt="" loading="lazy">
      <span class="video-play" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28"><path d="M8 5v14l11-7z" fill="currentColor" /></svg>
      </span>
      <span v-if="tieneTramo" class="video-tramo">{{ textoTramo }}</span>
    </button>
  </div>
</template>

<style scoped>
.video-youtube {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 12px;
  overflow: hidden;
  background: #111;
}
.video-youtube iframe,
.video-portada {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.video-portada {
  padding: 0;
  cursor: pointer;
  background: #111;
}
.video-portada img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.video-play {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  color: #fff;
  background: rgba(0, 0, 0, 0.7);
  transform: translate(-50%, -50%);
  transition: background 0.15s;
}
.video-portada:hover .video-play {
  background: var(--color-primario, #c4302b);
}
.video-portada:focus-visible {
  outline: 3px solid var(--color-foco, #ffbf47);
  outline-offset: -3px;
}
.video-tramo {
  position: absolute;
  right: 8px;
  bottom: 8px;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 0.85rem;
  color: #fff;
  background: rgba(0, 0, 0, 0.75);
}
.video-error {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  margin: 0;
  padding: 16px;
  text-align: center;
  color: #fff;
}
</style>
