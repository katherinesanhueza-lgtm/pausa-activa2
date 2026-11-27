// Pruebas de RF-09. Se corren con: npm test (desde la carpeta frontend).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  obtenerIdYoutube, esEnlaceYoutube, urlMiniatura, urlIncrustada,
  segundoDelEnlace, validarTramo, duracionDelTramo, formatearSegundos,
} from './youtube.js'

const ID = 'abcDEF12345'

test('reconoce los formatos de enlace de YouTube', () => {
  const enlaces = [
    `https://www.youtube.com/watch?v=${ID}`,
    `https://youtube.com/watch?v=${ID}&t=30s&list=PL123`,
    `https://m.youtube.com/watch?v=${ID}`,
    `https://youtu.be/${ID}`,
    `https://youtu.be/${ID}?si=compartido`,
    `https://www.youtube.com/shorts/${ID}`,
    `https://www.youtube.com/embed/${ID}`,
    `https://www.youtube-nocookie.com/embed/${ID}?start=5`,
    `https://www.youtube.com/live/${ID}`,
    `www.youtube.com/watch?v=${ID}`,
    `youtu.be/${ID}`,
    `  https://youtu.be/${ID}  `,
  ]
  for (const enlace of enlaces) assert.equal(obtenerIdYoutube(enlace), ID, enlace)
})

test('rechaza enlaces que no son videos de YouTube', () => {
  const enlaces = [
    '', '   ', null, undefined, 42, 'hola',
    'https://vimeo.com/123456789',
    'https://www.youtube.com/',
    'https://www.youtube.com/watch',
    'https://www.youtube.com/watch?v=corto',
    `https://www.youtube.com/watch?v=${ID}xyz`,
    `https://www.youtube.com.sitio-falso.com/watch?v=${ID}`,
    `https://sitio-falso.com/watch?v=${ID}`,
    `https://sitio-falso.com/youtu.be/${ID}`,
    `ftp://youtu.be/${ID}`,
    `javascript:alert(1)//youtu.be/${ID}`,
  ]
  for (const enlace of enlaces) assert.equal(obtenerIdYoutube(enlace), null, String(enlace))
  assert.equal(esEnlaceYoutube('https://vimeo.com/1'), false)
  assert.equal(esEnlaceYoutube(`https://youtu.be/${ID}`), true)
})

test('arma la miniatura del video', () => {
  assert.equal(urlMiniatura(ID), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  assert.equal(urlMiniatura(ID, 'mqdefault'), `https://i.ytimg.com/vi/${ID}/mqdefault.jpg`)
  assert.equal(urlMiniatura(ID, 'otra'), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`)
  assert.equal(urlMiniatura('malo'), null)
  assert.equal(urlMiniatura(null), null)
})

test('arma el reproductor incrustado con el tramo', () => {
  const completo = new URL(urlIncrustada(ID))
  assert.equal(completo.origin + completo.pathname, `https://www.youtube-nocookie.com/embed/${ID}`)
  assert.equal(completo.searchParams.get('start'), null)
  assert.equal(completo.searchParams.get('end'), null)

  const tramo = new URL(urlIncrustada(ID, { inicio: 30, termino: '45', autoplay: true }))
  assert.equal(tramo.searchParams.get('start'), '30')
  assert.equal(tramo.searchParams.get('end'), '45')
  assert.equal(tramo.searchParams.get('autoplay'), '1')

  assert.equal(urlIncrustada('malo'), null)
})

test('lee el segundo que trae el enlace', () => {
  assert.equal(segundoDelEnlace(`https://youtu.be/${ID}?t=90`), 90)
  assert.equal(segundoDelEnlace(`https://youtu.be/${ID}?t=90s`), 90)
  assert.equal(segundoDelEnlace(`https://www.youtube.com/watch?v=${ID}&t=1m30s`), 90)
  assert.equal(segundoDelEnlace(`https://www.youtube.com/watch?v=${ID}&t=1h2m3s`), 3723)
  assert.equal(segundoDelEnlace(`https://www.youtube.com/embed/${ID}?start=15`), 15)
  assert.equal(segundoDelEnlace(`https://youtu.be/${ID}`), null)
  assert.equal(segundoDelEnlace(`https://youtu.be/${ID}?t=abc`), null)
  assert.equal(segundoDelEnlace('https://vimeo.com/1?t=10'), null)
})

test('valida el tramo con las mismas reglas que Supabase', () => {
  assert.equal(validarTramo(0, null), null)
  assert.equal(validarTramo('', ''), null)
  assert.equal(validarTramo(10, 25), null)
  assert.equal(validarTramo('10', '25'), null)
  assert.match(validarTramo(-1, null), /inicio/)
  assert.match(validarTramo(1.5, null), /inicio/)
  assert.match(validarTramo('abc', null), /inicio/)
  assert.match(validarTramo(10, 10), /mayor/)
  assert.match(validarTramo(20, 10), /mayor/)
  assert.match(validarTramo(0, 7.5), /término/)
})

test('calcula la duración con el tramo', () => {
  assert.equal(duracionDelTramo(10, 25), 15)
  assert.equal(duracionDelTramo('', '20'), 20)
  assert.equal(duracionDelTramo(0, null), null)
  assert.equal(duracionDelTramo(20, 10), null)
})

test('muestra los segundos como minutos', () => {
  assert.equal(formatearSegundos(0), '0:00')
  assert.equal(formatearSegundos(9), '0:09')
  assert.equal(formatearSegundos(75), '1:15')
  assert.equal(formatearSegundos(3725), '1:02:05')
  assert.equal(formatearSegundos(-5), '0:00')
})
