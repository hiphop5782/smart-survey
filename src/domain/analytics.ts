import type { AnalyticsSummary, AnswerValue, DistributionItem, Option, Question, Survey, SurveyResponse } from './types'
import { isQuestionVisible } from './visibility'

function optionLabel(options: Option[] | undefined, value: string): string {
  return options?.find((option) => option.value === value)?.label ?? value
}

function toDistribution(values: string[], options?: Option[]): DistributionItem[] {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: optionLabel(options, value), count, percentage: values.length ? Math.round((count / values.length) * 1000) / 10 : 0 }))
    .sort((left, right) => right.count - left.count)
}

function answerExists(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null || value === '') return false
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

export function calculateAnalytics(
  survey: Survey,
  responses: SurveyResponse[],
  answerKey: Record<string, string> = {},
): AnalyticsSummary {
  let totalMissingAnswers = 0
  const questions = survey.questions.map((question) => {
    const applicableResponses = responses.filter((response) => isQuestionVisible(question, response.answers))
    const rawValues = applicableResponses.map((response) => response.answers[question.id]).filter(answerExists) as AnswerValue[]
    const missing = applicableResponses.length - rawValues.length
    totalMissingAnswers += missing
    const summary = {
      questionId: question.id,
      title: question.title,
      type: question.type,
      answered: rawValues.length,
      missing,
    } as AnalyticsSummary['questions'][number]

    if (question.type === 'shortText' || question.type === 'longText') {
      summary.textValues = rawValues.filter((value): value is string => typeof value === 'string')
      return summary
    }

    if (question.type === 'termMatrix' && 'terms' in question) {
      const matrix: Record<string, DistributionItem[]> = {}
      question.terms.forEach((term) => {
        const values = rawValues
          .filter((value): value is Record<string, string> => typeof value === 'object' && !Array.isArray(value) && value !== null)
          .map((value) => value[term.value])
          .filter((value): value is string => Boolean(value))
        matrix[term.label] = toDistribution(values, question.levels)
      })
      summary.matrix = matrix
      return summary
    }

    const flattened = rawValues.flatMap((value) => (Array.isArray(value) ? value : [String(value)]))
    summary.distribution = toDistribution(flattened, question.options)
    if (question.type === 'codeQuiz' && answerKey[question.id]) {
      summary.correctCount = rawValues.filter((value) => value === answerKey[question.id]).length
      summary.correctRate = rawValues.length ? Math.round((summary.correctCount / rawValues.length) * 1000) / 10 : 0
    }
    return summary
  })

  return { totalResponses: responses.length, totalMissingAnswers, questions }
}

function escapeCsv(value: unknown): string {
  const text = value === undefined || value === null ? '' : typeof value === 'object' ? JSON.stringify(value) : String(value)
  return `"${text.replaceAll('"', '""')}"`
}

export function responsesToCsv(survey: Survey, responses: SurveyResponse[]): string {
  const headers = ['responseId', 'submittedAt', 'surveyId', 'revision', ...survey.questions.map((question) => question.id)]
  const rows = responses.map((response) => [
    response.responseId,
    response.submittedAt,
    response.surveyId,
    response.revision,
    ...survey.questions.map((question) => response.answers[question.id]),
  ])
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\r\n')}`
}

export function findQuestion(survey: Survey, id: string): Question | undefined {
  return survey.questions.find((question) => question.id === id)
}
