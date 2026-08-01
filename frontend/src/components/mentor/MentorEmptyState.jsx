import React from 'react'

const QUICK_STARTS = [
  "Kâr marjımı nasıl hesaplarım?",
  "Müşteri segmentimi nasıl belirlerim?",
  "Nakit akışımı nasıl iyileştirebilirim?",
  "Bir işletme kararımı değerlendirelim."
]

export default function MentorEmptyState({ onQuickStart }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
        İşletmeniz için neyi netleştirmek istiyorsunuz?
      </h3>
      <p className="text-sm text-[var(--text-light)] mb-8 max-w-sm">
        AI Mentor işletmenizle ilgili sorularınızı yanıtlayabilir, size özel analiz ve öneriler sunabilir.
      </p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
        {QUICK_STARTS.map((text, i) => (
          <button
            key={i}
            onClick={() => onQuickStart(text)}
            className="text-left text-sm p-3 bg-white border border-[var(--border)] rounded-lg hover:border-[var(--primary)] hover:bg-[var(--primary-light)] transition-colors text-[var(--text)] shadow-sm"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
