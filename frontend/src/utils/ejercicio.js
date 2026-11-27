// RF-08: opciones, validaciones y conversión de un ejercicio.
// No dependen de Vue ni de Supabase. Los nombres de los campos son los de la tabla ejercicio.
import { esEnlaceYoutube, enlaceNormalizado, validarTramo, duracionDelTramo } from './youtube.js'

// En la base se guarda "valor"; en pantalla se muestra "texto".
export const DIFICULTADES = [
  { valor: 'baja', texto: 'Baja' },
  { valor: 'moderada', texto: 'Moderada' },
  { valor: 'alta', texto: 'Alta' },
]

export const CATEGORIAS = [
  { valor: 'movimiento', texto: 'Movimiento' },
  { valor: 'respiracion', texto: 'Respiración' },
  { valor: 'relajacion', texto: 'Relajación' },
  { valor: 'estiramiento', texto: 'Estiramiento' },
]

// La v3 no fija las zonas del cuerpo: esta lista es una propuesta para confirmar con el equipo.
// Una lista fija permite filtrar la biblioteca por zona (RF-10).
export const ZONAS_CUERPO = [
  { valor: 'cuerpo_completo', texto: 'Cuerpo completo' },
  { valor: 'cabeza_cuello', texto: 'Cabeza y cuello' },
  { valor: 'brazos_hombros', texto: 'Brazos y hombros' },
  { valor: 'tronco_espalda', texto: 'Tronco y espalda' },
  { valor: 'piernas_pies', texto: 'Piernas y pies' },
]

export const LARGO_MAXIMO = { nombre: 150, descripcion: 200, objetivo: 200, instrucciones: 2000 }

// Valores iniciales del formulario. Los números van como texto porque así llegan de los inputs.
export function ejercicioVacio() {
  return {
    nombre: '',
    descripcion: '',
    dificultad: '',
    categoria: '',
    zona_cuerpo: '',
    objetivo: '',
    instrucciones: '',
    url_video: '',
    segundo_inicio: '',
    segundo_termino: '',
    duracion_segundos: '',
  }
}

const limpio = valor => (typeof valor === 'string' ? valor.trim() : '')
const esOpcionDe = (lista, valor) => lista.some(opcion => opcion.valor === valor)
const estaVacio = valor => valor === '' || valor === null || valor === undefined

export function textoDe(lista, valor) {
  return lista.find(opcion => opcion.valor === valor)?.texto ?? ''
}

// Devuelve un objeto con un mensaje por campo con error. Si está vacío, el ejercicio es válido.
export function validarEjercicio(datos) {
  const errores = {}

  const nombre = limpio(datos.nombre)
  if (!nombre) errores.nombre = 'Escribe un título.'
  else if (nombre.length > LARGO_MAXIMO.nombre) errores.nombre = `El título puede tener hasta ${LARGO_MAXIMO.nombre} caracteres.`

  const descripcion = limpio(datos.descripcion)
  if (!descripcion) errores.descripcion = 'Escribe una descripción corta.'
  else if (descripcion.length > LARGO_MAXIMO.descripcion) errores.descripcion = `La descripción puede tener hasta ${LARGO_MAXIMO.descripcion} caracteres.`

  if (!esOpcionDe(DIFICULTADES, datos.dificultad)) errores.dificultad = 'Elige la dificultad.'
  if (!esOpcionDe(CATEGORIAS, datos.categoria)) errores.categoria = 'Elige una categoría.'
  if (!esOpcionDe(ZONAS_CUERPO, datos.zona_cuerpo)) errores.zona_cuerpo = 'Elige la zona del cuerpo.'

  const objetivo = limpio(datos.objetivo)
  if (!objetivo) errores.objetivo = 'Escribe el objetivo del ejercicio.'
  else if (objetivo.length > LARGO_MAXIMO.objetivo) errores.objetivo = `El objetivo puede tener hasta ${LARGO_MAXIMO.objetivo} caracteres.`

  if (limpio(datos.instrucciones).length > LARGO_MAXIMO.instrucciones) {
    errores.instrucciones = `Las instrucciones pueden tener hasta ${LARGO_MAXIMO.instrucciones} caracteres.`
  }

  if (!limpio(datos.url_video)) errores.url_video = 'Pega el enlace del video de YouTube.'
  else if (!esEnlaceYoutube(datos.url_video)) errores.url_video = 'El enlace no es un video válido de YouTube.'

  const errorTramo = validarTramo(datos.segundo_inicio, datos.segundo_termino)
  if (errorTramo) {
    errores[errorTramo.startsWith('El segundo de inicio') ? 'segundo_inicio' : 'segundo_termino'] = errorTramo
  } else if (duracionDelTramo(datos.segundo_inicio, datos.segundo_termino) === null) {
    // Sin tramo se usa el video completo y la duración la escribe el docente.
    const duracion = Number(datos.duracion_segundos)
    if (estaVacio(datos.duracion_segundos) || !Number.isInteger(duracion) || duracion <= 0) {
      errores.duracion_segundos = 'Escribe la duración en segundos: un número entero mayor que 0.'
    }
  }

  return errores
}

// Convierte los datos del formulario (ya validados) en la fila para insertar o actualizar en Supabase.
// idUsuario solo se pasa al crear; al editar no se cambia el creador.
export function aFilaEjercicio(datos, idUsuario) {
  const calculada = duracionDelTramo(datos.segundo_inicio, datos.segundo_termino)
  return {
    ...(idUsuario ? { id_usuario_creador: idUsuario } : {}),
    nombre: limpio(datos.nombre),
    descripcion: limpio(datos.descripcion),
    dificultad: datos.dificultad,
    categoria: datos.categoria,
    zona_cuerpo: datos.zona_cuerpo,
    objetivo: limpio(datos.objetivo),
    instrucciones: limpio(datos.instrucciones) || null,
    url_video: enlaceNormalizado(datos.url_video),
    segundo_inicio: estaVacio(datos.segundo_inicio) ? 0 : Number(datos.segundo_inicio),
    segundo_termino: estaVacio(datos.segundo_termino) ? null : Number(datos.segundo_termino),
    duracion_segundos: calculada ?? Number(datos.duracion_segundos),
  }
}

// Convierte una fila de Supabase en datos para el formulario (al editar un ejercicio).
export function deFilaEjercicio(fila) {
  const datos = ejercicioVacio()
  if (!fila) return datos
  for (const campo of Object.keys(datos)) datos[campo] = fila[campo] ?? ''
  return datos
}
