import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/services/api'
import Loading from '@/components/ui/Loading'
import styles from './PracticalCardList.module.css'

export default function PracticalCardList() {
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchCards()
  }, [])

  const fetchCards = async () => {
    try {
      setLoading(true)
      const res = await api.practicalCards.list()
      if (res && res.data) {
        setCards(res.data)
      }
    } catch (err) {
      setError(err.message || 'Kartlar yüklenirken bir hata oluştu.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <Loading />
  if (error) return <div className={`text-red-500 p-4 ${styles.error}`}>{error}</div>

  return (
    <div className={`container mx-auto px-4 py-8 ${styles.page}`}>
      <div className={`flex justify-between items-center mb-6 ${styles.headerRow}`}>
        <h1 className={`text-2xl font-bold text-gray-900 ${styles.title}`}>Pratik Kartlar</h1>
        <Link to="/app/practical-cards/saved" className={`text-primary-600 hover:text-primary-800 font-medium ${styles.savedLink}`}>
          Kaydedilen Kartlarım
        </Link>
      </div>

      <p className={`text-gray-600 mb-8 ${styles.intro}`}>İşletmeniz için kritik karar noktalarında kullanabileceğiniz, eyleme dönük pratik formüller ve kontrol listeleri.</p>

      {cards.length === 0 ? (
        <div className={`bg-gray-50 rounded-lg p-8 text-center text-gray-500 ${styles.empty}`}>
          Henüz pratik kart bulunmamaktadır.
        </div>
      ) : (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${styles.grid}`}>
          {cards.map(card => (
            <Link
              key={card.id}
              to={`/app/practical-cards/${card.code}`}
              className={`bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden flex flex-col h-full ${styles.card}`}
            >
              <div className={`p-6 flex-grow ${styles.cardBody}`}>
                <div className={`flex items-center justify-between mb-3 ${styles.cardMeta}`}>
                  <span className={`text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-1 rounded ${styles.category}`}>
                    {card.category || 'Genel'}
                  </span>
                  <span className={`text-xs text-gray-400 font-mono ${styles.code}`}>{card.code}</span>
                </div>
                <h3 className={`text-lg font-bold text-gray-900 mb-2 ${styles.cardTitle}`}>{card.title}</h3>
                <p className={`text-gray-600 text-sm ${styles.cardDesc}`}>{card.shortDescription}</p>
              </div>
              <div className={`px-6 py-4 border-t border-gray-100 bg-gray-50 mt-auto ${styles.cardFooter}`}>
                <span className={`text-sm font-medium text-primary-600 flex items-center ${styles.cardCta}`}>
                  Kartı İncele
                  <svg className="w-4 h-4 ml-1" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
