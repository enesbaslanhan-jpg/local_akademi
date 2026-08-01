import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/services/api'

export default function DecisionCheckList() {
  const [checks, setChecks] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    // Feature flag check is done on the server, UI can just fetch
    api.get('/api/v1/decision-checks')
      .then(res => setChecks(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const startCheck = async (code) => {
    try {
      const res = await api.post(`/api/v1/decision-checks/${code}/start`)
      if (res.data.sessionId) {
        navigate(`/app/decision-checks/${res.data.sessionId}`)
      }
    } catch (err) {
      console.error(err)
      alert('Başlatılamadı')
    }
  }

  if (loading) return <div className="p-8">Yükleniyor...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Karar Kontrolleri</h1>
      {checks.length === 0 ? (
        <p className="text-gray-500">Henüz yayınlanmış bir karar kontrolü bulunmamaktadır.</p>
      ) : (
        <div className="grid gap-6">
          {checks.map(c => (
            <div key={c.code} className="border p-6 rounded-xl shadow-sm hover:shadow-md transition">
              <h2 className="text-xl font-semibold">{c.title}</h2>
              <p className="text-gray-600 mt-2">{c.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">{c.category}</span>
                <button
                  onClick={() => startCheck(c.code)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Teste Başla
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
