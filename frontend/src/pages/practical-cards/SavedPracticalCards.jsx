import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import Loading from '@/components/ui/Loading'

export default function SavedPracticalCards() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchSavedCards()
  }, [])

  const fetchSavedCards = async () => {
    try {
      setLoading(true)
      const res = await api.practicalCards.getSaved()
      if (res && res.data) {
        setCards(res.data)
      }
    } catch (err) {
      setError(err.message || 'Kaydedilen kartlar yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (id) => {
    try {
      await api.practicalCards.unsave(id)
      setCards(cards.filter(c => c.id !== id))
    } catch (err) {
      alert('İşlem başarısız oldu.')
    }
  }

  if (loading) return <Loading />
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/app/practical-cards" className="inline-flex items-center text-gray-500 hover:text-gray-900 mb-4 font-medium text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Tüm Kartlara Dön
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Kaydedilen Kartlarım</h1>
      </div>

      {error && <div className="text-red-500 mb-4">{error}</div>}

      {cards.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center text-gray-500 border border-dashed border-gray-300">
          <p className="mb-4">Henüz hiç kart kaydetmediniz.</p>
          <Link to="/app/practical-cards" className="bg-white border border-gray-200 shadow-sm text-gray-700 hover:text-primary-600 font-medium py-2 px-4 rounded transition-colors">
            Kartları Keşfet
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full relative group">
              
              <button 
                onClick={() => handleUnsave(card.id)}
                className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors z-10 opacity-0 group-hover:opacity-100"
                title="Kaydedilenlerden Çıkar"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              <Link to={`/app/practical-cards/${card.code}`} className="flex-grow p-6 hover:bg-gray-50 transition-colors block">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded">
                    {card.category || 'Genel'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-600 text-sm">{card.shortDescription}</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
