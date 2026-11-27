// RF-09: funciones para trabajar con enlaces de YouTube.
// No dependen de Vue ni de Supabase: reciben datos y devuelven datos,
// así se pueden usar en el formulario de ejercicios, la biblioteca y el modo clase.

// El código de un video de YouTube siempre tiene 11 caracteres: letras, números, _ y -.
const ID_VALIDO = /^[A-Za-z0-9_-]{11}$/

const DOMINIOS_LARGOS = ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com']
const DOMINIOS_CORTOS = ['youtu.be', 'www.youtu.be']
const RUTAS_CON_ID = ['embed', 'shorts', 'live', 'v']
const CALIDADES_MINIATURA = ['default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault']

// Convierte el texto pegado por el docente en un objeto URL, o null si no se puede.
// Acepta enlaces sin "https://" (por ejemplo "youtu.be/abc...").
function leerUrl(enlace) {
  if (typeof enlace !== 'string') return null
  const texto = enlace.trim()
  if (!texto) return null
  try {
    const url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null
  } catch {
    return null
  }
}

// Devuelve el código del video (11 caracteres) o null si el enlace no es de YouTube.
export function obtenerIdYoutube(enlace) {
  const url = leerUrl(enlace)
  if (!url) return null
  const dominio = url.hostname.toLowerCase()
  const partes = url.pathname.split('/').filter(Boolean)
  let id = null
  if (DOMINIOS_CORTOS.includes(dominio)) {
    id = partes[0]
  } else if (DOMINIOS_LARGOS.includes(dominio)) {
    if (partes[0] === 'watch') id = url.searchParams.get('v')
    else if (RUTAS_CON_ID.includes(partes[0])) id = partes[1]
  }
  return id && ID_VALIDO.test(id) ? id : null
}

export function esEnlaceYoutube(enlace) {
  return obtenerIdYoutube(enlace) !== null
}

// Miniatura que YouTube genera para cada video; se usa en las listas (RNF-04).
export function urlMiniatura(id, calidad = 'hqdefault') {
  if (!ID_VALIDO.test(id ?? '')) return null
  const tamano = CALIDADES_MINIATURA.includes(calidad) ? calidad : 'hqdefault'
  return `https://i.ytimg.com/vi/${id}/${tamano}.jpg`
}

// Dirección del reproductor incrustado. Si hay tramo, YouTube reproduce solo
// desde "inicio" hasta "termino". youtube-nocookie.com no guarda cookies hasta que se reproduce.
export function urlIncrustada(id, { inicio = 0, termino = null, autoplay = false } = {}) {
  if (!ID_VALIDO.test(id ?? '')) return null
  const parametros = new URLSearchParams({ rel: '0', playsinline: '1' })
  const desde = aSegundos(inicio)
  const hasta = aSegundos(termino)
  if (desde > 0) parametros.set('start', String(desde))
  if (hasta !== null && !Number.isNaN(hasta)) parametros.set('end', String(hasta))
  if (autoplay) parametros.set('autoplay', '1')
  return `https://www.youtube-nocookie.com/embed/${id}?${parametros}`
}

// Si el enlace pegado ya trae un segundo (por ejemplo "?t=1m30s"), lo devuelve
// para proponerlo como segundo de inicio. Si no trae, devuelve null.
export function segundoDelEnlace(enlace) {
  if (!esEnlaceYoutube(enlace)) return null
  const url = leerUrl(enlace)
  const valor = url.searchParams.get('t') ?? url.searchParams.get('start')
  if (!valor) return null
  if (/^\d+s?$/.test(valor)) return parseInt(valor, 10)
  const partes = valor.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!partes || !partes[0]) return null
  return Number(partes[1] ?? 0) * 3600 + Number(partes[2] ?? 0) * 60 + Number(partes[3] ?? 0)
}

// Los campos de un formulario llegan como texto: "" o null significan "sin valor".
function aSegundos(valor) {
  if (valor === '' || valor === null || valor === undefined) return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : NaN
}

// Mismas reglas que la tabla ejercicio en Supabase:
// segundo_inicio >= 0 y segundo_termino vacío o mayor que el inicio.
// Devuelve null si el tramo es válido, o un mensaje para mostrar al docente.
export function validarTramo(inicio, termino) {
  const desde = aSegundos(inicio) ?? 0
  const hasta = aSegundos(termino)
  if (!Number.isInteger(desde) || desde < 0) return 'El segundo de inicio debe ser un número entero de 0 o más.'
  if (hasta === null) return null
  if (!Number.isInteger(hasta)) return 'El segundo de término debe ser un número entero.'
  if (hasta <= desde) return 'El segundo de término debe ser mayor que el de inicio.'
  return null
}

// Duración del ejercicio según el tramo. Si no hay segundo de término
// (se usa el video completo), devuelve null y la duración la escribe el docente.
export function duracionDelTramo(inicio, termino) {
  if (validarTramo(inicio, termino) !== null) return null
  const hasta = aSegundos(termino)
  if (hasta === null) return null
  return hasta - (aSegundos(inicio) ?? 0)
}

// 75 → "1:15", 3725 → "1:02:05". Para mostrar el tramo en pantalla.
export function formatearSegundos(segundos) {
  const total = Math.max(0, Math.floor(Number(segundos) || 0))
  const horas = Math.floor(total / 3600)
  const minutos = Math.floor((total % 3600) / 60)
  const resto = String(total % 60).padStart(2, '0')
  return horas > 0 ? `${horas}:${String(minutos).padStart(2, '0')}:${resto}` : `${minutos}:${resto}`
}
