import assert from 'node:assert/strict'
import test from 'node:test'
import { SHIPPER_PERSONAS, personaFor } from '../src/personas.js'
import { desiredMembership } from '../src/policy.js'

test('defines ten distinct shipper personas with bounded pool capacity', () => {
  assert.equal(SHIPPER_PERSONAS.length, 10)
  assert.equal(SHIPPER_PERSONAS.filter((persona) => persona.poolRole === 'base').reduce((sum, persona) => sum + persona.teu, 0), 11)
  assert.deepEqual(SHIPPER_PERSONAS.filter((persona) => persona.poolRole.startsWith('flex')).map((persona) => persona.teu), [3, 3])
  assert.equal(personaFor('shipper-10').displayName, '화주 10')
})

test('rotates flexible agents through join and leave phases', () => {
  assert.equal(desiredMembership('base', 0), true)
  assert.equal(desiredMembership('flex-a', 0), false)
  assert.equal(desiredMembership('flex-a', 30_000), true)
  assert.equal(desiredMembership('flex-b', 30_000), false)
  assert.equal(desiredMembership('flex-a', 60_000), false)
  assert.equal(desiredMembership('flex-b', 60_000), true)
  assert.equal(desiredMembership('network', 60_000), false)
})
