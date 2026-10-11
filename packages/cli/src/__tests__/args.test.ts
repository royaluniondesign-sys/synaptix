import { describe, expect, it } from 'vitest'
import { parseArgs } from '../args.js'

describe('parseArgs', () => {
  it('defaults to help with no arguments', () => {
    expect(parseArgs([])).toEqual({ kind: 'help' })
    expect(parseArgs(['   '])).toEqual({ kind: 'help' })
  })

  it('recognises help aliases', () => {
    expect(parseArgs(['help']).kind).toBe('help')
    expect(parseArgs(['--help']).kind).toBe('help')
    expect(parseArgs(['-h']).kind).toBe('help')
  })

  it('recognises version aliases', () => {
    expect(parseArgs(['version']).kind).toBe('version')
    expect(parseArgs(['--version']).kind).toBe('version')
    expect(parseArgs(['-v']).kind).toBe('version')
  })

  it('parses status', () => {
    expect(parseArgs(['status'])).toEqual({ kind: 'status' })
  })

  it('parses a file path', () => {
    expect(parseArgs(['file', 'package.json'])).toEqual({ kind: 'file', path: 'package.json' })
  })

  it('parses --max-bytes in both forms', () => {
    expect(parseArgs(['file', 'a.txt', '--max-bytes', '128'])).toEqual({
      kind: 'file',
      path: 'a.txt',
      maxBytes: 128,
    })
    expect(parseArgs(['file', 'a.txt', '--max-bytes=256'])).toEqual({
      kind: 'file',
      path: 'a.txt',
      maxBytes: 256,
    })
  })

  it('ignores an invalid max-bytes value', () => {
    expect(parseArgs(['file', 'a.txt', '--max-bytes', 'nope'])).toEqual({
      kind: 'file',
      path: 'a.txt',
    })
  })

  it('rejects file without a path', () => {
    expect(parseArgs(['file']).kind).toBe('unknown')
  })

  it('reports unknown commands', () => {
    expect(parseArgs(['frobnicate'])).toEqual({ kind: 'unknown', input: 'frobnicate' })
  })
})
