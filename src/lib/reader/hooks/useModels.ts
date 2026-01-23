import { useCallback, useEffect, useState } from 'react'
import { listModels } from '@/lib/openai'
import { getSetting, setSetting } from '@/lib/tauri'
import { DEFAULT_MODEL } from '../constants'

export interface UseModelsResult {
  currentModel: string
  availableModels: string[]
  modelsLoading: boolean
  handleModelChange: (model: string) => Promise<void>
}

export function useModels(): UseModelsResult {
  const [currentModel, setCurrentModel] = useState(DEFAULT_MODEL)
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [modelsLoading, setModelsLoading] = useState(true)

  useEffect(() => {
    const loadModels = async () => {
      setModelsLoading(true)
      try {
        const [sortedModels, savedModel] = await Promise.all([
          listModels().catch(() => [] as string[]),
          getSetting('openai_model').catch(() => null),
        ])

        setAvailableModels(sortedModels)
        if (savedModel && sortedModels.includes(savedModel)) {
          setCurrentModel(savedModel)
        } else if (sortedModels.length > 0 && !sortedModels.includes(currentModel)) {
          setCurrentModel(sortedModels[0])
        }
      } catch (error) {
        console.error('Failed to load models:', error)
      } finally {
        setModelsLoading(false)
      }
    }
    loadModels()
  }, [])

  const handleModelChange = useCallback(async (model: string) => {
    setCurrentModel(model)
    try {
      await setSetting({ key: 'openai_model', value: model })
    } catch (error) {
      console.error('Failed to save model setting:', error)
    }
  }, [])

  return {
    currentModel,
    availableModels,
    modelsLoading,
    handleModelChange,
  }
}
