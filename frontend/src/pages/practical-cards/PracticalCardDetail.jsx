import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { api } from '@/services/api'
import Loading from '@/components/ui/Loading'
import { useMentorContext } from '@/context/MentorContext'
import { MessageSquare } from 'lucide-react'

export default function PracticalCardDetail() {
  const { code } = useParams()
  const navigate = useNavigate()
  const [card, setCard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSaved, setIsSaved] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(null) // 'helpful' | 'not_helpful' | null
  
  const mentorContext = useMentorContext()
  const isContextualMentorEnabled = import.meta.env.VITE_FF_CONTEXTUAL_MENTOR === 'true'

  useEffect(() => {
    fetchCardDetail()
  }, [code])

  const fetchCardDetail = async () => {
    try {
      setLoading(true)
      const res = await api.practicalCards.get(code)
      if (res && res.data) {
        setCard(res.data)
        checkIfSaved(res.data.id)
      }
    } catch (err) {
      setError(err.message || 'Kart bulunamadı.')
    } finally {
      setLoading(false)
    }
  }

  const checkIfSaved = async (cardId) => {
    try {
      const savedRes = await api.practicalCards.getSaved()
      if (savedRes && savedRes.data) {
        const found = savedRes.data.some(c => c.id === cardId)
        setIsSaved(found)
      }
    } catch (err) {
      console.error('Could not check saved status', err)
    }
  }

  const handleToggleSave = async () => {
    if (!card) return
    try {
      if (isSaved) {
        await api.practicalCards.unsave(card.id)
        setIsSaved(false)
      } else {
        await api.practicalCards.save(card.id)
        setIsSaved(true)
      }
    } catch (err) {
      console.error('Save action failed', err)
      alert('İşlem başarısız oldu.')
    }
  }

  const handleAskMentor = () => {
    if (mentorContext?.openMentorWithContext) {
      mentorContext.openMentorWithContext({
        contextType: 'practical_card',
        source: 'content_detail',
        practicalCardCode: card.code,
        title: card.title,
        route: window.location.pathname
      })
    }
  }

  const handleFeedback = async (val) => {
    if (!card) return
    try {
      await api.practicalCards.feedback(card.id, val)
      setFeedbackGiven(val)
    } catch (err) {
      console.error('Feedback failed', err)
    }
  }

  if (loading) return <Loading />
  if (error || !card) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error || 'Kart bulunamadı'}</div>
        <Link to="/app/practical-cards" className="inline-block mt-4 text-primary-600 font-medium hover:underline">
          &larr; Kartlara Dön
        </Link>
      </div>
    )
  }

  const { content, sources } = card

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <Link to="/app/practical-cards" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-6 font-medium text-sm">
        <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Pratik Kartlara Dön
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-gray-100 relative">
          <div className="flex justify-between items-start mb-4">
            <span className="text-sm font-semibold text-primary-700 bg-primary-50 px-3 py-1 rounded-full">
              {card.category}
            </span>
            <div className="flex items-center gap-2">
              {isContextualMentorEnabled && (
                <button
                  onClick={handleAskMentor}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm font-medium"
                  title="Bu kart hakkında Mentora soru sor"
                >
                  <MessageSquare size={16} /> Mentora Sor
                </button>
              )}
              <button 
                onClick={handleToggleSave}
                className={`p-2 rounded-full transition-colors ${isSaved ? 'bg-primary-50 text-primary-600' : 'bg-gray-50 text-gray-400 hover:text-gray-600'}`}
                title={isSaved ? "Kaydedilenlerden Çıkar" : "Kaydet"}
              >
                <svg className="w-5 h-5" fill={isSaved ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isSaved ? 1 : 2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{card.title}</h1>
          <p className="text-lg text-gray-600 leading-relaxed">{card.shortDescription}</p>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8">
          
          {content.mainContent && (
            <div className="prose max-w-none text-gray-700">
              <p className="text-lg leading-relaxed">{content.mainContent}</p>
            </div>
          )}

          {content.formula && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
              <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Hesaplama / Formül</h4>
              <p className="text-blue-900 font-medium font-mono text-lg">{content.formula}</p>
            </div>
          )}

          {content.example && (
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Örnek Senaryo</h4>
              <p className="text-gray-800 italic">{content.example}</p>
            </div>
          )}

          {content.checklistItems && content.checklistItems.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Kontrol Listesi</h4>
              <ul className="space-y-3">
                {content.checklistItems.map((item, idx) => (
                  <li key={idx} className="flex items-start">
                    <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.warning && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl">
              <div className="flex">
                <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h4 className="text-sm font-bold text-red-800 mb-1">Dikkat</h4>
                  <p className="text-sm text-red-700">{content.warning}</p>
                </div>
              </div>
            </div>
          )}

          {content.keyTakeaway && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Özet / Ana Fikir</h4>
              <p className="text-amber-900 font-medium">{content.keyTakeaway}</p>
            </div>
          )}

          {/* Primary Action Button */}
          {content.primaryAction && (
            <div className="pt-4">
              <button 
                onClick={() => navigate('/app/decision-checks')}
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-6 rounded-lg transition-colors text-center inline-block"
              >
                {content.primaryAction.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer & Feedback */}
        <div className="bg-gray-50 p-6 md:p-8 border-t border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            
            <div className="flex-1 w-full">
              {sources && sources.length > 0 && (
                <div className="text-xs text-gray-500">
                  <span className="font-semibold block mb-1">Kaynaklar:</span>
                  <div className="flex flex-wrap gap-2">
                    {sources.map(src => (
                      <Link key={src.id} to={`/knowledge/${src.id}`} className="bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 hover:text-primary-600 hover:border-primary-300 transition-colors">
                        {src.title}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600 font-medium">Bu kart faydalı oldu mu?</span>
              <button 
                onClick={() => handleFeedback('helpful')}
                disabled={feedbackGiven === 'helpful'}
                className={`p-2 rounded-full border transition-colors ${feedbackGiven === 'helpful' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-white border-gray-200 text-gray-400 hover:text-green-500 hover:border-green-300'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                </svg>
              </button>
              <button 
                onClick={() => handleFeedback('not_helpful')}
                disabled={feedbackGiven === 'not_helpful'}
                className={`p-2 rounded-full border transition-colors ${feedbackGiven === 'not_helpful' ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-300'}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                </svg>
              </button>
            </div>
            
          </div>
        </div>
      </div>
    </div>
  )
}
