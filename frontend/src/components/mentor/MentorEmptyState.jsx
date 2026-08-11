import React from 'react';
import styles from './MentorEmptyState.module.css';

const DEFAULT_QUICK_STARTS = [
  "Kâr marjımı nasıl hesaplarım?",
  "Müşteri segmentimi nasıl belirlerim?",
  "Nakit akışımı nasıl iyileştirebilirim?",
  "Bir işletme kararımı değerlendirelim."
];

const ESNAF_QUICK_STARTS = [
  "Ürünümün gerçek kârını hesaplayalım.",
  "Giderlerimi nasıl azaltabilirim?",
  "Müşteri segmentimi nasıl belirlerim?",
  "Nakit akışımı nasıl iyileştirebilirim?"
];

const GIRISIMCI_QUICK_STARTS = [
  "İş fikrimi nasıl doğrulayabilirim?",
  "Müşteri segmentimi belirleyelim.",
  "Kâr marjımı nasıl hesaplarım?",
  "Bir işletme kararımı değerlendirelim."
];

const YATIRIMCI_QUICK_STARTS = [
  "Bir işletmenin nakit akışını nasıl değerlendiririm?",
  "Kârlılık göstergelerini nasıl yorumlarım?",
  "Müşteri segmentimi nasıl belirlerim?",
  "Bir işletme kararımı değerlendirelim."
];

export function getQuickStartsByRole(role) {
  if (role === 'esnaf' || role === 'merchant') return ESNAF_QUICK_STARTS;
  if (role === 'girisimci' || role === 'entrepreneur') return GIRISIMCI_QUICK_STARTS;
  if (role === 'yatirimci' || role === 'investor') return YATIRIMCI_QUICK_STARTS;
  return DEFAULT_QUICK_STARTS;
}

export default function MentorEmptyState({ onQuickStart, role }) {
  const quickStarts = getQuickStartsByRole(role);

  return (
    <div className={`flex flex-col items-center justify-center h-full p-6 text-center ${styles.wrap}`}>
      <div className={styles.icon}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <h3 className={`text-lg font-semibold text-[var(--text)] mb-2 ${styles.title}`}>
        Yeni sohbet başlatın veya aşağıdaki hızlı başlangıçlardan birini seçin.
      </h3>
      <p className={`text-sm text-[var(--text-light)] mb-8 max-w-sm ${styles.subtitle}`}>
        AI Mentor işletmenizle ilgili sorularınızı yanıtlayabilir, size özel analiz ve öneriler sunabilir.
      </p>

      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md ${styles.quickGrid}`}>
        {quickStarts.map((text, i) => (
          <button
            key={i}
            onClick={() => onQuickStart(text)}
            className={styles.quickBtn}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}
