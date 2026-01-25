import { describe, expect, it, mock, beforeEach } from 'bun:test'

// Mock the tauri/core module
const mockInvoke = mock(async (cmd: string, args?: any) => {
  switch (cmd) {
    case 'get_pocket_status':
      return 'stopped'
    case 'start_pocket_sidecar':
      return 'running'
    case 'stop_pocket_sidecar':
      return 'stopped'
    default:
      return null
  }
})

mock.module('../lib/tauri/core', () => ({
  invoke: mockInvoke,
  isTauri: true,
}))

describe('Pocket Sidecar Lifecycle', () => {
  beforeEach(() => {
    mockInvoke.mockClear()
  })

  it('should be able to get the current status', async () => {
    const { invoke } = await import('../lib/tauri/core')
    const status = await invoke('get_pocket_status')
    expect(status).toBe('stopped')
    expect(mockInvoke).toHaveBeenCalledWith('get_pocket_status')
  })

  it('should be able to start the sidecar', async () => {
    const { invoke } = await import('../lib/tauri/core')
    const status = await invoke('start_pocket_sidecar')
    expect(status).toBe('running')
    expect(mockInvoke).toHaveBeenCalledWith('start_pocket_sidecar')
  })

  it('should be able to stop the sidecar', async () => {
    const { invoke } = await import('../lib/tauri/core')
    const status = await invoke('stop_pocket_sidecar')
    expect(status).toBe('stopped')
    expect(mockInvoke).toHaveBeenCalledWith('stop_pocket_sidecar')
  })
})
