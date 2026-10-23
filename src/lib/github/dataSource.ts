import { demoSurvey, demoSurveyIndex } from '../../data/demo'
import { parseSurvey } from '../../domain/schema'
import type { StackDefinition, Survey, SurveyIndexItem, TemplateDefinition } from '../../domain/types'
import { stackDefinitions as bundledStacks, templates as bundledTemplates } from '../../data/catalog'

const RAW_ROOT = 'https://raw.githubusercontent.com/hiphop5782/smart-survey/data'

export async function fetchSurvey(surveyId: string): Promise<{ survey: Survey; demo: boolean }> {
  if (surveyId === demoSurvey.surveyId) return { survey: demoSurvey, demo: true }
  if (!/^[a-z0-9][a-z0-9-]{2,63}$/.test(surveyId)) throw new Error('설문 ID 형식이 올바르지 않습니다.')
  const response = await fetch(`${RAW_ROOT}/surveys/${surveyId}/survey.json`, { cache: 'no-store' })
  if (!response.ok) throw new Error(response.status === 404 ? '게시된 설문을 찾지 못했습니다.' : `설문을 불러오지 못했습니다. (HTTP ${response.status})`)
  return { survey: parseSurvey(await response.json()), demo: false }
}

export async function fetchSurveyIndex(): Promise<{ surveys: SurveyIndexItem[]; demo: boolean }> {
  try {
    const response = await fetch(`${RAW_ROOT}/surveys/index.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const value = (await response.json()) as { schemaVersion: number; surveys: SurveyIndexItem[] }
    if (value.schemaVersion !== 1 || !Array.isArray(value.surveys)) throw new Error('invalid index')
    return { surveys: value.surveys.filter((survey) => survey.status === 'published'), demo: false }
  } catch {
    return { surveys: demoSurveyIndex, demo: true }
  }
}

export async function fetchTemplateCatalog(): Promise<{ templates: TemplateDefinition[]; remote: boolean }> {
  try {
    const response = await fetch(`${RAW_ROOT}/templates/index.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const index = (await response.json()) as { schemaVersion: number; templates: Array<{ templateId: string; path?: string }> }
    if (index.schemaVersion !== 1 || !Array.isArray(index.templates)) throw new Error('invalid template index')
    const loaded = await Promise.all(index.templates.map(async (item) => {
      const path = item.path ?? `templates/${item.templateId}.json`
      if (!/^templates\/[a-z0-9-]+\.json$/.test(path)) throw new Error('invalid template path')
      const templateResponse = await fetch(`${RAW_ROOT}/${path}`, { cache: 'no-store' })
      if (!templateResponse.ok) throw new Error(`template ${item.templateId}: ${templateResponse.status}`)
      return (await templateResponse.json()) as TemplateDefinition
    }))
    return { templates: loaded, remote: true }
  } catch {
    return { templates: bundledTemplates, remote: false }
  }
}

export async function fetchStackCatalog(): Promise<{ stacks: StackDefinition[]; remote: boolean }> {
  try {
    const response = await fetch(`${RAW_ROOT}/templates/stack-catalog.json`, { cache: 'no-store' })
    if (!response.ok) throw new Error(String(response.status))
    const value = (await response.json()) as { schemaVersion: number; stacks: StackDefinition[] }
    if (value.schemaVersion !== 1 || !Array.isArray(value.stacks)) throw new Error('invalid stack catalog')
    return { stacks: value.stacks, remote: true }
  } catch {
    return { stacks: bundledStacks, remote: false }
  }
}
