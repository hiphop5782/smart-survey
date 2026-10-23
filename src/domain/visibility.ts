import type { AnswerValue, Question } from './types'

export function isQuestionVisible(question: Question, answers: Record<string, AnswerValue>): boolean {
  if (!question.showIf) return true
  const source = answers[question.showIf.questionId]
  if (question.showIf.notEquals !== undefined) return source !== question.showIf.notEquals
  if (question.showIf.includes !== undefined) {
    return Array.isArray(source) && source.includes(question.showIf.includes)
  }
  return source === question.showIf.equals
}

export function isAnswerEmpty(value: AnswerValue | undefined): boolean {
  if (value === undefined || value === null || value === '') return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0 || Object.values(value).some((item) => !item)
  return false
}

export function validateQuestionAnswer(question: Question, value: AnswerValue | undefined): string | null {
  if (question.required && isAnswerEmpty(value)) return '필수 문항입니다.'
  if (isAnswerEmpty(value)) return null
  if (typeof value === 'string') {
    if (question.validation?.minLength && value.trim().length < question.validation.minLength) return `${question.validation.minLength}자 이상 입력하세요.`
    if (question.validation?.maxLength && value.length > question.validation.maxLength) return `${question.validation.maxLength}자 이하로 입력하세요.`
  }
  if (Array.isArray(value)) {
    if (question.validation?.minSelections && value.length < question.validation.minSelections) return `${question.validation.minSelections}개 이상 선택하세요.`
    if (question.validation?.maxSelections && value.length > question.validation.maxSelections) return `${question.validation.maxSelections}개 이하로 선택하세요.`
  }
  return null
}
