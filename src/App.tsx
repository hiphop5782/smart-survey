import { HashRouter, Route, Routes } from 'react-router-dom'
import { AdminSessionProvider } from './app/AdminSession'
import { Layout } from './components/Layout'
import { HomePage } from './pages/HomePage'
import { SurveyPage } from './pages/SurveyPage'
import { AdminPage } from './pages/AdminPage'
import { SurveyBuilderPage } from './pages/SurveyBuilderPage'
import { ResultsPage } from './pages/ResultsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <AdminSessionProvider>
      <HashRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/s/:surveyId" element={<SurveyPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/surveys/new" element={<SurveyBuilderPage />} />
            <Route path="/admin/surveys/:surveyId" element={<SurveyBuilderPage />} />
            <Route path="/admin/surveys/:surveyId/results" element={<ResultsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </AdminSessionProvider>
  )
}
