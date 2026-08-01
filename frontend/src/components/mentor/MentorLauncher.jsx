import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare } from 'lucide-react'

export default function MentorLauncher() {
  const { isPanelOpen, togglePanel, isFullPage } = useMentorContext()

  if (isFullPage) return null

  return (
    <button
      onClick={togglePanel}
      className={`fixed bottom-6 right-6 z-40 flex items-center justify-center p-3 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${
        isPanelOpen ? 'bg-gray-800 text-white shadow-md' : 'bg-[var(--primary)] text-white shadow-xl'
      }`}
      aria-label="AI Mentor'u Aç"
      title="AI Mentor"
    >
      <MessageSquare className="w-6 h-6" />
      {!isPanelOpen && <span className="ml-2 pr-1 font-medium hidden md:inline">AI Mentor</span>}
    </button>
  )
}
