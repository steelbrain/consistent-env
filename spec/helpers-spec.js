/* @flow */

import { it } from 'jasmine-fix'
import * as Helpers from '../src/helpers'

describe('Helpers', function() {
  const globalEnd = process.env
  beforeEach(function() {
    process.env = { SHELL: process.env.SHELL }
  })
  afterEach(function() {
    process.env = globalEnd
  })

  describe('identifyEnvironment', function() {
    it('returns an array', function() {
      const raw = Helpers.identifyEnvironment()
      expect(Array.isArray(raw)).toBe(true)
    })
    it('contains a valid response', function() {
      const raw = Helpers.identifyEnvironment().join('\n')
      expect(raw).toContain('PATH=')
      expect(raw).toContain('SHELL=')
    })
    it('throws an error if it cant work', function() {
      process.env.SHELL = '/ha'
      expect(function() {
        Helpers.identifyEnvironment()
      }).toThrow()
    })
  })

  describe('identifyEnvironmentAsync', function() {
    it('returns an array', async function() {
      const raw = await Helpers.identifyEnvironmentAsync()
      expect(Array.isArray(raw)).toBe(true)
    })
    it('contains a valid response', async function() {
      let raw = await Helpers.identifyEnvironmentAsync()
      raw = raw.join('\n')
      expect(raw).toContain('PATH=')
      expect(raw).toContain('SHELL=')
    })
    it('throws an error if it cant work', async function() {
      process.env.SHELL = '/ha'
      try {
        await Helpers.identifyEnvironmentAsync()
        expect(false).toBe(true)
      } catch (error) {
        expect(typeof error.message).toBe('string')
        expect(error.code).toBe('ENOENT')
      }
    })
  })

  describe('parse', function() {
    it('parses properly ignoring spaces', function() {
      const env = `
        PATH=/usr/local/bin
        HOME=/home/steel
      `.split('\n')
      const parsed = Helpers.parse(env)
      expect(Object.keys(parsed)).toEqual(['PATH', 'HOME'])
      expect(parsed.PATH).toBe('/usr/local/bin')
      expect(parsed.HOME).toBe('/home/steel')
    })
  })

  describe('applySugar', function() {
    it('sets PWD to process.cwd()', function() {
      const env = Helpers.applySugar({})
      expect(env.PWD).toBe(process.cwd())
      expect(env.OLDPWD).toBe(process.cwd())
    })

    it('merges PATH', function() {
      process.env.PATH = '/games'
      const env = Helpers.applySugar({ PATH: '/usr/bin' })
      expect(env.PATH).toContain('/games')
    })
    it('works well even when no local PATH is found', function() {
      const env = Helpers.applySugar({ PATH: '/usr/bin' })
      expect(env.PATH).toBe('/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/bin:/usr/bin')
    })
    it('works well even when no external PATH is found', function() {
      process.env.PATH = '/games'
      const env = Helpers.applySugar({})
      expect(env.PATH).toBe('/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/games')
    })
    it('does not add duplicates', function() {
      process.env.PATH = '/usr/bin'
      const env = Helpers.applySugar({ PATH: '/usr/bin' })
      expect(env.PATH).toBe('/usr/local/sbin:/usr/local/bin:/usr/sbin:/sbin:/bin:/usr/bin')
    })

    it('uses global USER if available', function() {
      process.env.USER = 'steel'
      const env = Helpers.applySugar({})
      expect(env.USER).toBe('steel')
    })
    it('guesses from HOME if available', function() {
      let env
      env = Helpers.applySugar({ HOME: '/home/steel' })
      expect(env.USER).toBe('steel')

      env = Helpers.applySugar({ HOME: '/Users/steel' })
      expect(env.USER).toBe('steel')

      env = Helpers.applySugar({ HOME: '/root' })
      expect(env.USER).toBe('root')
    })
    it('prefers USER env over HOME', function() {
      process.env.USER = 'steel'
      const env = Helpers.applySugar({ HOME: '/root' })
      expect(env.USER).toBe('steel')
    })
  })
})
