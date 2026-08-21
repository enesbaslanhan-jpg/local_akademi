import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import Loading from '@/components/ui/Loading'
import LegacyFeatureUnavailable from '@/components/legacy/LegacyFeatureUnavailable'
import { featureFlags } from '@/config/featureFlags'


const AuthPage = lazy(() => import('@/pages/AuthPage'))
const PasswordResetPage = lazy(() => import('@/pages/PasswordResetPage'))
const EmailVerifyPage = lazy(() => import('@/pages/PasswordResetPage').then(m => ({ default: m.EmailVerifyPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage'))
const InvitationPage = lazy(() => import('@/pages/InvitationPage'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'))
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage'))
const KnowledgeDetail = lazy(() => import('@/pages/KnowledgeDetail'))
const KnowledgeTopicPage = lazy(() => import('@/pages/KnowledgeTopicPage'))
const CoursesPage = lazy(() => import('@/pages/CoursesPage'))
const CoursePlayerPage = lazy(() => import('@/pages/CoursePlayerPage'))
const LearningPathPage = lazy(() => import('@/pages/LearningPathPage'))
const MentorPage = lazy(() => import('@/pages/MentorPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ToolsPage = lazy(() => import('@/pages/ToolsPage'))
const FinancialModelWorkspace = lazy(() => import('@/pages/FinancialModelWorkspace'))
const FlashcardDashboardPage = lazy(() => import('@/pages/FlashcardDashboardPage'))
const FlashcardStudyPage = lazy(() => import('@/pages/FlashcardStudyPage'))
const QuizDashboardPage = lazy(() => import('@/pages/QuizDashboardPage'))
const QuizTakePage = lazy(() => import('@/pages/QuizTakePage'))
const PilotLearningPathPage = lazy(() => import('@/pages/PilotLearningPathPage'))
const CommunityPage = lazy(() => import('@/pages/CommunityPage'))
const NewsPage = lazy(() => import('@/pages/NewsPage'))
const WorkspaceList = lazy(() => import('@/pages/Workspaces/index'))
const WorkspaceLayout = lazy(() => import('@/pages/Workspaces/WorkspaceLayout'))
const WorkspaceOverview = lazy(() => import('@/pages/Workspaces/Overview'))
const WorkspaceTracker = lazy(() => import('@/pages/Workspaces/Tracker'))
const WorkspaceCalendar = lazy(() => import('@/pages/Workspaces/Calendar'))
const WorkspaceDocuments = lazy(() => import('@/pages/Workspaces/Documents'))
const WorkspaceNotifications = lazy(() => import('@/pages/Workspaces/Notifications'))
const WorkspaceTeam = lazy(() => import('@/pages/Workspaces/Team'))
const WorkspaceContacts = lazy(() => import('@/pages/Workspaces/Contacts'))
const WorkspaceSettings = lazy(() => import('@/pages/Workspaces/Settings'))
const WorkspaceActivity = lazy(() => import('@/pages/Workspaces/Activity'))
const DecisionCheckList = lazy(() => import('@/pages/DecisionCheckList'))
const DecisionCheckSession = lazy(() => import('@/pages/DecisionCheckSession'))
const DecisionToolsPage = lazy(() => import('@/pages/DecisionToolsPage'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))
const LegalPage = lazy(() => import('@/pages/LegalPage'))
const SupportPage = lazy(() => import('@/pages/SupportPage'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminKnowledge = lazy(() => import('@/pages/admin/AdminKnowledge'))
const AdminKOForm = lazy(() => import('@/pages/admin/AdminKOForm'))
const AdminKOReview = lazy(() => import('@/pages/admin/AdminKOReview'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminImports = lazy(() => import('@/pages/admin/AdminImports'))
const AdminAuditLog = lazy(() => import('@/pages/admin/AdminAuditLog'))
const AdminCommunity = lazy(() => import('@/pages/admin/AdminCommunity'))

function SuspenseWrapper({ children }) {
  return <Suspense fallback={<Loading text="Sayfa yükleniyor..." />}>{children}</Suspense>
}

export default function AppRoutes() {
  return (
    <SuspenseWrapper>
      <Routes>
        {/* Public auth routes */}
        <Route path="/login" element={<SuspenseWrapper><AuthPage mode="login" /></SuspenseWrapper>} />
        <Route path="/register" element={<SuspenseWrapper><AuthPage mode="register" /></SuspenseWrapper>} />
        <Route path="/forgot-password" element={<SuspenseWrapper><PasswordResetPage mode="request" /></SuspenseWrapper>} />
        <Route path="/reset-password" element={<SuspenseWrapper><PasswordResetPage mode="confirm" /></SuspenseWrapper>} />
        <Route path="/verify-email" element={<SuspenseWrapper><EmailVerifyPage /></SuspenseWrapper>} />
        <Route path="/unauthorized" element={<SuspenseWrapper><Unauthorized /></SuspenseWrapper>} />
        <Route path="/privacy" element={<SuspenseWrapper><LegalPage type="privacy" /></SuspenseWrapper>} />
        <Route path="/terms" element={<SuspenseWrapper><LegalPage type="terms" /></SuspenseWrapper>} />
        <Route path="/cookies" element={<SuspenseWrapper><LegalPage type="cookies" /></SuspenseWrapper>} />
        <Route path="/yardim" element={<SuspenseWrapper><SupportPage /></SuspenseWrapper>} />
        <Route path="/hakkinda" element={<SuspenseWrapper><AboutPage /></SuspenseWrapper>} />
        {/* Davet baglantisinin dustugu yer. Giris GEREKMIYOR: davetli
            cogunlukla oturum acmamis geliyor, sayfa onu ?next= ile giris
            ekranina yonlendirip geri getiriyor. */}
        <Route path="/davet" element={<SuspenseWrapper><InvitationPage /></SuspenseWrapper>} />

        {/* Protected learner routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/decision-tools" element={<SuspenseWrapper><DecisionToolsPage /></SuspenseWrapper>} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<SuspenseWrapper><Dashboard /></SuspenseWrapper>} />
            <Route path="onboarding" element={<SuspenseWrapper><OnboardingPage /></SuspenseWrapper>} />
            <Route path="assessment" element={<SuspenseWrapper><AssessmentPage /></SuspenseWrapper>} />
            <Route path="knowledge" element={<SuspenseWrapper><KnowledgePage /></SuspenseWrapper>} />
            <Route path="knowledge/topic/:topicKey" element={<SuspenseWrapper><KnowledgeTopicPage /></SuspenseWrapper>} />
            <Route path="knowledge/:code" element={<SuspenseWrapper><KnowledgeDetail /></SuspenseWrapper>} />
            <Route path="courses" element={<SuspenseWrapper><CoursesPage /></SuspenseWrapper>} />
            <Route path="courses/:courseId/learn/:lessonId?" element={<SuspenseWrapper><CoursePlayerPage /></SuspenseWrapper>} />
            <Route path="enrollments" element={<SuspenseWrapper><CoursesPage initialTab="enrollments" /></SuspenseWrapper>} />
            <Route path="learning-path" element={<SuspenseWrapper><LearningPathPage /></SuspenseWrapper>} />
            <Route path="learning-path/pilot" element={<SuspenseWrapper><PilotLearningPathPage /></SuspenseWrapper>} />
            <Route path="mentor" element={<SuspenseWrapper><MentorPage /></SuspenseWrapper>} />
            {/* Haberler yalnızca resmî içerik; Topluluk kullanıcı gönderileri.
                Aynı bileşen iki modda çalışır, yeni endpoint yok. */}
            <Route path="community" element={<SuspenseWrapper><NewsPage /></SuspenseWrapper>} />
            <Route path="community/topluluk" element={<SuspenseWrapper><CommunityPage mode="community" /></SuspenseWrapper>} />
            <Route path="tools" element={<SuspenseWrapper><ToolsPage /></SuspenseWrapper>} />
            <Route path="calculations" element={<SuspenseWrapper><ToolsPage initialView="calculator" /></SuspenseWrapper>} />
            <Route path="decision-checks" element={<SuspenseWrapper><DecisionCheckList /></SuspenseWrapper>} />
            <Route path="decision-checks/:code" element={<SuspenseWrapper><DecisionCheckSession /></SuspenseWrapper>} />
            <Route path="finance/models" element={<Navigate to="/app/calculations" replace />} />
            <Route path="finance/models/:modelCode" element={<SuspenseWrapper><FinancialModelWorkspace /></SuspenseWrapper>} />
            <Route path="flashcards" element={featureFlags.legacyFlashcards ? <SuspenseWrapper><FlashcardDashboardPage /></SuspenseWrapper> : <LegacyFeatureUnavailable feature="flashcards" />} />
            <Route path="flashcards/study" element={featureFlags.legacyFlashcards ? <SuspenseWrapper><FlashcardStudyPage /></SuspenseWrapper> : <LegacyFeatureUnavailable feature="flashcards" />} />
            <Route path="flashcards/study/:koId" element={featureFlags.legacyFlashcards ? <SuspenseWrapper><FlashcardStudyPage /></SuspenseWrapper> : <LegacyFeatureUnavailable feature="flashcards" />} />
            <Route path="quiz" element={featureFlags.legacyQuiz ? <SuspenseWrapper><QuizDashboardPage /></SuspenseWrapper> : <LegacyFeatureUnavailable feature="quiz" />} />
            <Route path="quiz/take/:koId" element={featureFlags.legacyQuiz ? <SuspenseWrapper><QuizTakePage /></SuspenseWrapper> : <LegacyFeatureUnavailable feature="quiz" />} />
            <Route path="settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
            <Route path="workspaces" element={<SuspenseWrapper><WorkspaceList /></SuspenseWrapper>} />
            <Route path="workspaces/:workspaceId" element={<SuspenseWrapper><WorkspaceLayout /></SuspenseWrapper>}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<SuspenseWrapper><WorkspaceOverview /></SuspenseWrapper>} />
              <Route path="tracker" element={<SuspenseWrapper><WorkspaceTracker /></SuspenseWrapper>} />
              <Route path="calendar" element={<SuspenseWrapper><WorkspaceCalendar /></SuspenseWrapper>} />
              <Route path="documents" element={<SuspenseWrapper><WorkspaceDocuments /></SuspenseWrapper>} />
              <Route path="notifications" element={<SuspenseWrapper><WorkspaceNotifications /></SuspenseWrapper>} />
              <Route path="team" element={<SuspenseWrapper><WorkspaceTeam /></SuspenseWrapper>} />
              <Route path="contacts" element={<SuspenseWrapper><WorkspaceContacts /></SuspenseWrapper>} />
              <Route path="settings" element={<SuspenseWrapper><WorkspaceSettings /></SuspenseWrapper>} />
              <Route path="activity" element={<SuspenseWrapper><WorkspaceActivity /></SuspenseWrapper>} />
            </Route>
          </Route>
        </Route>

        {/* Protected admin routes - KO management accessible by editor/reviewer/admin */}
        <Route element={<ProtectedRoute requiredRole={['admin', 'content_editor', 'subject_expert']} />}>
          <Route path="/admin" element={<AppLayout />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<SuspenseWrapper><AdminDashboard /></SuspenseWrapper>} />
            <Route path="knowledge" element={<SuspenseWrapper><AdminKnowledge /></SuspenseWrapper>} />
            <Route path="knowledge/new" element={<SuspenseWrapper><AdminKOForm /></SuspenseWrapper>} />
            <Route path="knowledge/:code" element={<SuspenseWrapper><AdminKOReview /></SuspenseWrapper>} />
            <Route path="knowledge/:code/edit" element={<SuspenseWrapper><AdminKOForm /></SuspenseWrapper>} />
            {/* Admin-only sub-routes */}
            <Route element={<ProtectedRoute requiredRole="admin" />}>
              <Route path="users" element={<SuspenseWrapper><AdminUsers /></SuspenseWrapper>} />
              <Route path="imports" element={<SuspenseWrapper><AdminImports /></SuspenseWrapper>} />
              <Route path="audit-logs" element={<SuspenseWrapper><AdminAuditLog /></SuspenseWrapper>} />
              <Route path="community" element={<SuspenseWrapper><AdminCommunity /></SuspenseWrapper>} />
            </Route>
          </Route>
        </Route>

        {/* Root redirect */}
        <Route path="/" element={<RootRedirect />} />

        {/* 404 */}
        <Route path="*" element={<SuspenseWrapper><NotFound /></SuspenseWrapper>} />
      </Routes>
    </SuspenseWrapper>
  )
}

/*
 * Kok yol.
 *
 * Giris YAPMIS kullanici panoya gider. Giris yapmamis ziyaretci artik
 * dogrudan giris formuna DUSURULMUYOR: onceden urunun ne oldugunu
 * anlatan hicbir sayfa yoktu, ilk karsilasma bir parola alaniydi.
 */
function RootRedirect() {
  const token = localStorage.getItem('token')
  if (token) return <Navigate to="/app/dashboard" replace />
  return <SuspenseWrapper><AboutPage /></SuspenseWrapper>
}
