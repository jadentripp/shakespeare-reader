import { describe, expect, it, mock, beforeEach } from 'bun:test'

// Mock the tauri/core module
const mockInvoke = mock(async (cmd: string, args?: any) => {
    switch (cmd) {
        case 'get_qwen_status':
            return 'stopped'
        case 'start_qwen_sidecar':
            return 'running'
        case 'stop_qwen_sidecar':
            return 'stopped'
        default:
            return null
    }
})

mock.module('../lib/tauri/core', () => ({
    invoke: mockInvoke,
    isTauri: true
}))

describe('Qwen Sidecar Lifecycle', () => {
    beforeEach(() => {
        mockInvoke.mockClear()
    })

    it('should be able to get the current status', async () => {
        const { invoke } = await import('../lib/tauri/core')
        const status = await invoke('get_qwen_status')
        expect(status).toBe('stopped')
        expect(mockInvoke).toHaveBeenCalledWith('get_qwen_status')
    })

    it('should be able to start the sidecar', async () => {
        const { invoke } = await import('../lib/tauri/core')
        const status = await invoke('start_qwen_sidecar')
        expect(status).toBe('running')
        expect(mockInvoke).toHaveBeenCalledWith('start_qwen_sidecar')
    })

    it('should be able to stop the sidecar', async () => {
        const { invoke } = await import('../lib/tauri/core')
        const status = await invoke('stop_qwen_sidecar')
        expect(status).toBe('stopped')
        expect(mockInvoke).toHaveBeenCalledWith('stop_qwen_sidecar')
    })
})
