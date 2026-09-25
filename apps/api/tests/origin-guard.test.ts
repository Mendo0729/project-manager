import assert from 'node:assert/strict'
import test from 'node:test'

import Fastify from 'fastify'

import { rejectCrossOriginMutation } from '../src/common/http/reject-cross-origin-mutation.js'

test('browser requests from other origins cannot mutate the API', async () => {
  const app = Fastify()
  app.addHook('onRequest', rejectCrossOriginMutation)
  app.get('/resource', async () => ({ ok: true }))
  app.post('/resource', async () => ({ ok: true }))

  try {
    assert.equal((await app.inject({ method: 'GET', url: '/resource', headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 200)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { 'sec-fetch-site': 'cross-site' } })).statusCode, 403)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { 'sec-fetch-site': 'same-site' } })).statusCode, 403)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { origin: 'https://other.example' } })).statusCode, 403)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { origin: 'null' } })).statusCode, 403)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { origin: 'http://localhost:80', host: 'localhost:80' } })).statusCode, 200)
    assert.equal((await app.inject({ method: 'POST', url: '/resource', headers: { 'sec-fetch-site': 'same-origin', origin: 'http://localhost:5180', host: '127.0.0.1:3000' } })).statusCode, 200)
  } finally {
    await app.close()
  }
})
