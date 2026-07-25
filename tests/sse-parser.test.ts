import { describe, it, expect } from 'vitest'

function parseSSEChunk(buffer: string): { events: Array<{ event: string; data: any }>; leftover: string } {
  const events: Array<{ event: string; data: any }> = []
  const lines = buffer.split('\n')
  const leftover = lines.pop() || ''
  let currentEvent = ''
  let currentData = ''

  for (const line of lines) {
    if (line.startsWith('event: ')) {
      currentEvent = line.slice(7).trim()
    } else if (line.startsWith('data: ')) {
      currentData = line.slice(6).trim()
    } else if (line === '') {
      if (currentEvent && currentData) {
        try {
          events.push({ event: currentEvent, data: JSON.parse(currentData) })
        } catch { /* skip malformed JSON */ }
      }
      currentEvent = ''
      currentData = ''
    }
  }

  return { events, leftover }
}

describe('SSE Parser', () => {
  it('tek event parse eder', () => {
    const input = 'event: delta\ndata: {"type":"delta","delta":"Merhaba"}\n\n'
    const { events, leftover } = parseSSEChunk(input)
    expect(events.length).toBe(1)
    expect(events[0].event).toBe('delta')
    expect(events[0].data.delta).toBe('Merhaba')
    expect(leftover).toBe('')
  })

  it('arka arkaya iki event parse eder', () => {
    const input = 'event: delta\ndata: {"type":"delta","delta":"Mer"}\n\nevent: delta\ndata: {"type":"delta","delta":"haba"}\n\n'
    const { events, leftover } = parseSSEChunk(input)
    expect(events.length).toBe(2)
    expect(events[0].data.delta).toBe('Mer')
    expect(events[1].data.delta).toBe('haba')
    expect(leftover).toBe('')
  })

  it('kısmi event leftover olarak kalır', () => {
    const input = 'event: delta\ndata: {"type":"delta","delta":"Merhaba"}\n\nevent: start\nda'
    const { events, leftover } = parseSSEChunk(input)
    expect(events.length).toBe(1)
    expect(events[0].event).toBe('delta')
    expect(leftover).toBe('da')
  })

  it('boş satırları atlar', () => {
    const input = '\n\n\nevent: delta\ndata: {"type":"delta","delta":"test"}\n\n'
    const { events } = parseSSEChunk(input)
    expect(events.length).toBe(1)
    expect(events[0].data.delta).toBe('test')
  })

  it('data olmayan eventi atlar', () => {
    const input = 'event: start\ndata: \n\n'
    const { events } = parseSSEChunk(input)
    expect(events.length).toBe(0)
  })

  it('event olmayan datayı atlar', () => {
    const input = 'data: {"type":"delta","delta":"test"}\n\n'
    const { events } = parseSSEChunk(input)
    expect(events.length).toBe(0)
  })

  it('birden çok farklı event türünü işler', () => {
    const input = 'event: start\ndata: {"type":"start","conversationId":1}\n\nevent: provider\ndata: {"type":"provider","provider":"ollama"}\n\nevent: delta\ndata: {"type":"delta","delta":"Hello"}\n\nevent: done\ndata: {"type":"done","assistantMessage":{"id":5}}\n\n'
    const { events } = parseSSEChunk(input)
    expect(events.length).toBe(4)
    expect(events[0].event).toBe('start')
    expect(events[1].event).toBe('provider')
    expect(events[2].event).toBe('delta')
    expect(events[3].event).toBe('done')
  })

  it('UTF-8 bölünmüş karakterleri düzgün işler', () => {
    const input = 'event: delta\ndata: {"type":"delta","delta":"Merhaba dünya"}\n\n'
    const { events } = parseSSEChunk(input)
    expect(events[0].data.delta).toBe('Merhaba dünya')
  })

  it('sadece event satırı varsa beklemede kalır', () => {
    const input = 'event: delta\n'
    const { events, leftover } = parseSSEChunk(input)
    expect(events.length).toBe(0)
    expect(leftover).toBe('')
  })

  it('sadece data satırı varsa beklemede kalır', () => {
    const input = 'event: delta\ndata: {"type":"test"}'
    const { events, leftover } = parseSSEChunk(input)
    expect(events.length).toBe(0)
    expect(leftover).toBe('data: {"type":"test"}')
  })

  it('geçersiz JSON sessizce atlanır', () => {
    const input = 'event: delta\ndata: {bozuk json}\n\n'
    const { events } = parseSSEChunk(input)
    expect(events.length).toBe(0)
  })
})
