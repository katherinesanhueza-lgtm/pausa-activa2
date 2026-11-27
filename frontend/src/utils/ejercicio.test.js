// Pruebas de RF-08. Se corren con: npm test (desde la carpeta frontend).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  DIFICULTADES, CATEGORIAS, ZONAS_CUERPO, ejercicioVacio, validarEjercicio,
  aFilaEjercicio, deFilaEjercicio, textoDe,
} from './ejercicio.js'

const ID = 'abcDEF12345'

function ejercicioValido(cambios = {}) {
  return {
    ...ejercicioVacio(),
    nombre: '  Brazos arriba  ',
    descripcion: 'Estiramos los brazos hacia el techo.',
    dificultad: 'baja',
    categoria: 'estiramiento',
    zona_cuerpo: 'brazos_hombros',
    objetivo: 'Activar el cuerpo después de estar sentados.',
    url_video: `https://youtu.be/${ID}?si=xyz`,
    segundo_inicio: '10',
    segundo_termino: '25',
    ...cambios,
  }
}

test('las opciones son las de la v3', () => {
  assert.deepEqual(DIFICULTADES.map(o => o.valor), ['baja', 'moderada', 'alta'])
  assert.deepEqual(CATEGORIAS.map(o => o.valor), ['movimiento', 'respiracion', 'relajacion', 'estiramiento'])
  assert.ok(ZONAS_CUERPO.length > 0)
  assert.equal(textoDe(CATEGORIAS, 'respiracion'), 'Respiración')
  assert.equal(textoDe(CATEGORIAS, 'otra'), '')
})

test('un ejercicio completo no tiene errores', () => {
  assert.deepEqual(validarEjercicio(ejercicioValido()), {})
  // Sin tramo, con la duración escrita a mano.
  assert.deepEqual(validarEjercicio(ejercicioValido({ segundo_inicio: '', segundo_termino: '', duracion_segundos: '40' })), {})
  // Las instrucciones son opcionales.
  assert.deepEqual(validarEjercicio(ejercicioValido({ instrucciones: '' })), {})
})

test('un formulario vacío marca todos los campos obligatorios', () => {
  const errores = validarEjercicio(ejercicioVacio())
  assert.deepEqual(Object.keys(errores).sort(), [
    'categoria', 'descripcion', 'dificultad', 'duracion_segundos', 'nombre', 'objetivo', 'url_video', 'zona_cuerpo',
  ])
})

test('rechaza valores que no corresponden', () => {
  assert.ok(validarEjercicio(ejercicioValido({ nombre: '   ' })).nombre)
  assert.ok(validarEjercicio(ejercicioValido({ nombre: 'a'.repeat(151) })).nombre)
  assert.ok(validarEjercicio(ejercicioValido({ descripcion: 'a'.repeat(201) })).descripcion)
  assert.ok(validarEjercicio(ejercicioValido({ dificultad: 'extrema' })).dificultad)
  assert.ok(validarEjercicio(ejercicioValido({ categoria: 'baile' })).categoria)
  assert.ok(validarEjercicio(ejercicioValido({ zona_cuerpo: 'otra' })).zona_cuerpo)
  assert.ok(validarEjercicio(ejercicioValido({ instrucciones: 'a'.repeat(2001) })).instrucciones)
  assert.match(validarEjercicio(ejercicioValido({ url_video: 'https://vimeo.com/1' })).url_video, /no es un video/)
})

test('el error del tramo queda en el campo que corresponde', () => {
  assert.ok(validarEjercicio(ejercicioValido({ segundo_inicio: '-3' })).segundo_inicio)
  assert.ok(validarEjercicio(ejercicioValido({ segundo_termino: '5' })).segundo_termino)
})

test('sin tramo la duración es obligatoria', () => {
  const sinTramo = { segundo_inicio: '', segundo_termino: '' }
  assert.ok(validarEjercicio(ejercicioValido({ ...sinTramo, duracion_segundos: '' })).duracion_segundos)
  assert.ok(validarEjercicio(ejercicioValido({ ...sinTramo, duracion_segundos: '0' })).duracion_segundos)
  assert.ok(validarEjercicio(ejercicioValido({ ...sinTramo, duracion_segundos: '12.5' })).duracion_segundos)
  // Con tramo la duración se calcula y no se pide.
  assert.equal(validarEjercicio(ejercicioValido({ duracion_segundos: '' })).duracion_segundos, undefined)
})

test('convierte el formulario en la fila de Supabase', () => {
  const fila = aFilaEjercicio(ejercicioValido({ instrucciones: '  ' }), 'uuid-docente')
  assert.deepEqual(fila, {
    id_usuario_creador: 'uuid-docente',
    nombre: 'Brazos arriba',
    descripcion: 'Estiramos los brazos hacia el techo.',
    dificultad: 'baja',
    categoria: 'estiramiento',
    zona_cuerpo: 'brazos_hombros',
    objetivo: 'Activar el cuerpo después de estar sentados.',
    instrucciones: null,
    url_video: `https://www.youtube.com/watch?v=${ID}`,
    segundo_inicio: 10,
    segundo_termino: 25,
    duracion_segundos: 15,
  })
  const sinTramo = aFilaEjercicio(ejercicioValido({ segundo_inicio: '', segundo_termino: '', duracion_segundos: '40' }))
  assert.equal(sinTramo.id_usuario_creador, undefined)
  assert.equal(sinTramo.segundo_inicio, 0)
  assert.equal(sinTramo.segundo_termino, null)
  assert.equal(sinTramo.duracion_segundos, 40)
})

test('carga una fila de Supabase en el formulario para editarla', () => {
  const fila = aFilaEjercicio(ejercicioValido(), 'uuid-docente')
  const datos = deFilaEjercicio({ ...fila, id_ejercicio: 7, estado: 'activo' })
  assert.equal(datos.nombre, 'Brazos arriba')
  assert.equal(datos.instrucciones, '')
  assert.equal(datos.segundo_termino, 25)
  assert.equal('id_ejercicio' in datos, false)
  assert.deepEqual(validarEjercicio(datos), {})
  assert.deepEqual(deFilaEjercicio(null), ejercicioVacio())
})
