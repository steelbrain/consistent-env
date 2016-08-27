/* @flow */

import { it } from 'jasmine-fix'
import consistentEnvironment from '../'
import { CACHE_KEY } from '../lib/helpers'

describe('consistent-env', function() {
  const globalEnv = process.env
  beforeEach(function() {
    process.env = { SHELL: process.env.SHELL }
  })
  afterEach(function() {
    delete global[CACHE_KEY]
    process.env = globalEnv
  })

  it('needs just the shell', function() {
    const foundEnv = consistentEnvironment()
    expect(foundEnv.PATH).toContain('/usr/local/bin')
    expect(foundEnv.PATH).toContain('/usr/bin')
    expect(foundEnv.PATH).toContain('/bin')
    expect(foundEnv.SHELL).toBe(globalEnv.SHELL)
  })

  it('has a caching that works well', function() {
    const env1 = consistentEnvironment()
    const env2 = consistentEnvironment()
    const env3 = consistentEnvironment()
    expect(env1).toEqual(env2)
    expect(env1).toEqual(env3)
  })

  it('has an async that needs just the shell', async function() {
    const foundEnv = await consistentEnvironment.async()
    expect(foundEnv.PATH).toContain('/usr/local/bin')
    expect(foundEnv.PATH).toContain('/usr/bin')
    expect(foundEnv.PATH).toContain('/bin')
    expect(foundEnv.SHELL).toBe(globalEnv.SHELL)
  })

  it('has an async that has a caching that works well', async function() {
    const env1 = await consistentEnvironment.async()
    const env2 = await consistentEnvironment.async()
    const env3 = await consistentEnvironment.async()
    expect(env1).toEqual(env2)
    expect(env1).toEqual(env3)
  })

  it('has returns env as is for unknown shells', function() {
    process.env.SHELL = 'beepbeep'
    process.env.WEIRD = 'true'
    const env = consistentEnvironment()
    expect(env).toEqual(process.env)
  })

  it('asyncly returns env as is for unknown shells', async function() {
    process.env.SHELL = 'beepbeep'
    process.env.WEIRD = 'true'
    const env = await consistentEnvironment.async()
    expect(env).toEqual(process.env)
  })

  it('can work without a shell', async function() {
    delete process.env.SHELL
    process.env.HEY = 'YES'
    const env = await consistentEnvironment.async()
    expect(env).toEqual(process.env)
  })
})
