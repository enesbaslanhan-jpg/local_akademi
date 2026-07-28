import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import Loading from '@/components/ui/Loading'

const AuthPage = lazy(() => import('@/pages/AuthPage'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage'))
const AssessmentPage = lazy(() => import('@/pages/AssessmentPage'))
const KnowledgePage = lazy(() => import('@/pages/KnowledgePage'))
const KnowledgeDetail = lazy(() => import('@/pages/KnowledgeDetail'))
const KnowledgeTopicPage = lazy(() => import('@/pages/KnowledgeTopicPage'))
const CoursesPage = lazy(() => import('@/pages/CoursesPage'))
const CoursePlayerPage = lazy(() => import('@/pages/CoursePlayerPage'))
const EnrollmentsPage = lazy(() => import('@/pages/EnrollmentsPage'))
const LearningPathPage = lazy(() => import('@/pages/LearningPathPage'))
const MentorPage = lazy(() => import('@/pages/MentorPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ToolsPage = lazy(() => import('@/pages/ToolsPage'))
const FlashcardDashboardPage = lazy(() => import('@/pages/FlashcardDashboardPage'))
const FlashcardStudyPage = lazy(() => import('@/pages/FlashcardStudyPage'))
const QuizDashboardPage = lazy(() => import('@/pages/QuizDashboardPage'))
const QuizTakePage = lazy(() => import('@/pages/QuizTakePage'))
const PilotLearningPathPage = lazy(() => import('@/pages/PilotLearningPathPage'))
const CommunityPage = lazy(() => import('@/pages/CommunityPage'))
const WorkspaceList = lazy(() => import('@/pages/Workspaces/index'))
const WorkspaceLayout = lazy(() => import('@/pages/Workspaces/WorkspaceLayout'))
const WorkspaceOverview = lazy(() => import('@/pages/Workspaces/Overview'))
const WorkspaceTracker = lazy(() => import('@/pages/Workspaces/Tracker'))
const WorkspaceDocuments = lazy(() => import('@/pages/Workspaces/Documents'))
const WorkspaceNotifications = lazy(() => import('@/pages/Workspaces/Notifications'))
const WorkspaceTeam = lazy(() => import('@/pages/Workspaces/Team'))
const WorkspaceContacts = lazy(() => import('@/pages/Workspaces/Contacts'))
const WorkspaceSettings = lazy(() => import('@/pages/Workspaces/Settings'))
const WorkspaceActivity = lazy(() => import('@/pages/Workspaces/Activity'))
const NotFound = lazy(() => import('@/pages/NotFound'))
const Unauthorized = lazy(() => import('@/pages/Unauthorized'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminKnowledge = lazy(() => import('@/pages/admin/AdminKnowledge'))
const AdminKOForm = lazy(() => import('@/pages/admin/AdminKOForm'))
const AdminKOReview = lazy(() => import('@/pages/admin/AdminKOReview'))
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'))
const AdminImports = lazy(() => import('@/pages/admin/AdminImports'))
const AdminAuditLog = lazy(() => import('@/pages/admin/AdminAuditLog'))

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
        <Route path="/unauthorized" element={<SuspenseWrapper><Unauthorized /></SuspenseWrapper>} />

        {/* Protected learner routes */}
        <Route element={<ProtectedRoute />}>
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
            <Route path="enrollments" element={<SuspenseWrapper><EnrollmentsPage /></SuspenseWrapper>} />
            <Route path="learning-path" element={<SuspenseWrapper><LearningPathPage /></SuspenseWrapper>} />
            <Route path="learning-path/pilot" element={<SuspenseWrapper><PilotLearningPathPage /></SuspenseWrapper>} />
            <Route path="mentor" element={<SuspenseWrapper><MentorPage /></SuspenseWrapper>} />
            <Route path="community" element={<SuspenseWrapper><CommunityPage /></SuspenseWrapper>} />
            <Route path="tools" element={<SuspenseWrapper><ToolsPage /></SuspenseWrapper>} />
            <Route path="flashcards" element={<SuspenseWrapper><FlashcardDashboardPage /></SuspenseWrapper>} />
            <Route path="flashcards/study" element={<SuspenseWrapper><FlashcardStudyPage /></SuspenseWrapper>} />
            <Route path="flashcards/study/:koId" element={<SuspenseWrapper><FlashcardStudyPage /></SuspenseWrapper>} />
            <Route path="quiz" element={<SuspenseWrapper><QuizDashboardPage /></SuspenseWrapper>} />
            <Route path="quiz/take/:koId" element={<SuspenseWrapper><QuizTakePage /></SuspenseWrapper>} />
            <Route path="settings" element={<SuspenseWrapper><SettingsPage /></SuspenseWrapper>} />
            <Route path="workspaces" element={<SuspenseWrapper><WorkspaceList /></SuspenseWrapper>} />
            <Route path="workspaces/:workspaceId" element={<SuspenseWrapper><WorkspaceLayout /></SuspenseWrapper>}>
              <Route index element={<Navigate to="overview" replace />} />
              <Route path="overview" element={<SuspenseWrapper><WorkspaceOverview /></SuspenseWrapper>} />
              <Route path="tracker" element={<SuspenseWrapper><WorkspaceTracker /></SuspenseWrapper>} />
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

function RootRedirect() {
  const token = localStorage.getItem('token')
  return <Navigate to={token ? '/app/dashboard' : '/login'} replace />
}
