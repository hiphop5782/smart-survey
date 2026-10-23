import { commonQuestions, getTemplate, stackDefinitions } from './catalog'
import { syncStackQuestions } from '../domain/stackQuestions'
import type { Survey, SurveyIndexItem, SurveyResponse } from '../domain/types'

const courseTemplate = getTemplate('python-ai')!
const selectedStacks = ['python', 'pandas', 'tensorflow']

export const demoSurvey: Survey = {
  schemaVersion: 1,
  surveyId: 'demo-python-ai-2026',
  revision: 1,
  title: 'Python·AI 과정 사전 이해도 조사',
  description: '수업 난이도와 실습 속도를 조정하기 위한 데모 설문입니다. 개인정보를 적지 마세요.',
  course: { id: 'python-ai', name: 'Python·AI', cohort: '데모 1기' },
  status: 'published',
  createdAt: '2026-10-23T08:00:00.000Z',
  selectedStacks,
  questions: syncStackQuestions([...commonQuestions, ...courseTemplate.questions], selectedStacks, stackDefinitions),
}

export const demoSurveyIndex: SurveyIndexItem[] = [
  {
    surveyId: demoSurvey.surveyId,
    title: demoSurvey.title,
    courseName: demoSurvey.course.name,
    cohort: demoSurvey.course.cohort,
    revision: demoSurvey.revision,
    status: demoSurvey.status,
  },
]

const response = (index: number, answers: SurveyResponse['answers']): SurveyResponse => ({
  schemaVersion: 1,
  surveyId: demoSurvey.surveyId,
  revision: demoSurvey.revision,
  responseId: `10000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
  submittedAt: `2026-10-2${index}T0${index}:00:00.000Z`,
  answers,
})

export const demoResponses: SurveyResponse[] = [
  response(1, { ageBand: 'under30', majorBackground: 'nonMajor', experienceYears: 'none', motivation: ['employment'], aiExperience: 'weekly', learningConfidence: 3, pythonLearningHistory: 'under1month', pythonFamiliarity: 'seen', pythonOutputQuiz: '6', pandasFamiliarity: 'never', tensorflowFamiliarity: 'never', expectations: '데이터 분석 기초를 배우고 싶습니다.' }),
  response(2, { ageBand: '30s', majorBackground: 'adjacent', experienceYears: 'under1', motivation: ['careerChange', 'personal'], aiExperience: 'daily', learningConfidence: 4, pythonLearningHistory: '1to6months', pythonFamiliarity: 'understand', pythonOutputQuiz: '6', pandasFamiliarity: 'seen', tensorflowFamiliarity: 'never', expectations: '직접 모델을 만들어 보고 싶습니다.' }),
  response(3, { ageBand: '40s', majorBackground: 'major', experienceYears: '1to3', motivation: ['work'], aiExperience: 'weekly', learningConfidence: 5, pythonLearningHistory: '6plus', pythonFamiliarity: 'write', pythonOutputQuiz: '6', pandasFamiliarity: 'understand', tensorflowFamiliarity: 'seen', expectations: '업무 데이터를 자동화하고 싶습니다.' }),
]
