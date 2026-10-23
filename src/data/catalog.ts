import stackData from './stack-catalog.json'
import commonTemplate from './templates/common.json'
import dataAnalyticsTemplate from './templates/data-analytics.json'
import generativeAiTemplate from './templates/generative-ai.json'
import javaWebTemplate from './templates/java-web.json'
import pythonAiTemplate from './templates/python-ai.json'
import type { StackDefinition, TemplateDefinition } from '../domain/types'

export const stackDefinitions = stackData.stacks as StackDefinition[]
export const templates = [commonTemplate, pythonAiTemplate, javaWebTemplate, dataAnalyticsTemplate, generativeAiTemplate] as TemplateDefinition[]
export const commonQuestions = (commonTemplate as TemplateDefinition).questions

export function getTemplate(templateId: string): TemplateDefinition | undefined {
  return templates.find((template) => template.templateId === templateId)
}
