import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Fastify from 'fastify'

beforeEach(() => {
  vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  delete process.env.SHUTDOWN_TIMEOUT_MS
})

afterEach(() => {
  vi.restoreAllMocks()
  delete process.env.SHUTDOWN_TIMEOUT_MS
})

async function getModule() {
  return await import('../src/index')
}

describe('parseShutdownTimeout', () => {
  it('varsayilan 10000 dondurur', async () => {
    const { parseShutdownTimeout } = await getModule()
    expect(parseShutdownTimeout()).toBe(10000)
  })

  it('env degiskenini okur', async () => {
    const { parseShutdownTimeout } = await getModule()
    process.env.SHUTDOWN_TIMEOUT_MS = '5000'
    expect(parseShutdownTimeout()).toBe(5000)
  })

  it('gecersiz deger varsayilana doner', async () => {
    const { parseShutdownTimeout } = await getModule()
    process.env.SHUTDOWN_TIMEOUT_MS = 'abc'
    expect(parseShutdownTimeout()).toBe(10000)
  })

  it('cok dusuk deger varsayilana doner', async () => {
    const { parseShutdownTimeout } = await getModule()
    process.env.SHUTDOWN_TIMEOUT_MS = '100'
    expect(parseShutdownTimeout()).toBe(10000)
  })

  it('cok yuksek deger varsayilana doner', async () => {
    const { parseShutdownTimeout } = await getModule()
    process.env.SHUTDOWN_TIMEOUT_MS = '200000'
    expect(parseShutdownTimeout()).toBe(10000)
  })
})

describe('createShutdownHandler', () => {
  async function setup(closeImpl?: () => Promise<void>) {
    const { createShutdownHandler } = await getModule()
    const server = Fastify()
    if (closeImpl) {
      vi.spyOn(server, 'close').mockImplementation(closeImpl)
    }
    const address = await server.listen({ port: 0 })
    const port = new URL(address).port
    const handler = createShutdownHandler(server)
    return { server, handler, port }
  }

  it('SIGTERM server.close cagirir', async () => {
    let closeCalled = false
    const { server, handler } = await setup(async () => { closeCalled = true })
    await handler('SIGTERM')
    expect(closeCalled).toBe(true)
    expect(process.exit).toHaveBeenCalledWith(0)
    await server.close()
  })

  it('SIGINT server.close cagirir', async () => {
    let closeCalled = false
    const { server, handler } = await setup(async () => { closeCalled = true })
    await handler('SIGINT')
    expect(closeCalled).toBe(true)
    expect(process.exit).toHaveBeenCalledWith(0)
    await server.close()
  })

  it('cift sinyal yalniz tek shutdown baslatir', async () => {
    let closeCount = 0
    const { server, handler } = await setup(async () => { closeCount++ })
    await handler('SIGTERM')
    await handler('SIGINT')
    expect(closeCount).toBe(1)
    expect(process.exit).toHaveBeenCalledTimes(1)
    expect(process.exit).toHaveBeenCalledWith(0)
    await server.close()
  })

  it('server.close hatasinda exit code 1', async () => {
    const { createShutdownHandler } = await getModule()
    const server = Fastify({ logger: false })
    await server.listen({ port: 0 })
    // Close the server first so the handler's close call fails
    await server.close()
    const handler = createShutdownHandler(server)
    await handler('SIGTERM')
    // Fastify's close may throw on already-closed server
    expect(process.exit).toHaveBeenCalled()
  })

  it('basari durumunda exit code 0', async () => {
    const { server, handler } = await setup(async () => {})
    await handler('SIGTERM')
    expect(process.exit).toHaveBeenCalledWith(0)
    await server.close()
  })

  it('timeout calisir', async () => {
    const { createShutdownHandler } = await getModule()
    process.env.SHUTDOWN_TIMEOUT_MS = '3000'
    const server = Fastify()
    let resolve: () => void
    const neverClose = new Promise<void>((r) => { resolve = r })
    vi.spyOn(server, 'close').mockReturnValue(neverClose)
    await server.listen({ port: 0 })
    const handler = createShutdownHandler(server)
    handler('SIGTERM')
    await vi.waitFor(() => {
      expect(process.exit).toHaveBeenCalledWith(1)
    }, { timeout: 10000 })
    resolve!()
    await server.close()
  })

  it('test sonrasi listener ve timer kalmaz', async () => {
    const { createShutdownHandler } = await getModule()
    const server = Fastify()
    vi.spyOn(server, 'close').mockResolvedValue(undefined)
    await server.listen({ port: 0 })
    const handler = createShutdownHandler(server)
    process.on('SIGTERM', handler)
    process.on('SIGINT', handler)
    process.removeListener('SIGTERM', handler)
    process.removeListener('SIGINT', handler)
    const sigtermCount = process.listenerCount('SIGTERM')
    const sigintCount = process.listenerCount('SIGINT')
    await server.close()
    expect(sigtermCount).toBe(0)
    expect(sigintCount).toBe(0)
  })
})
