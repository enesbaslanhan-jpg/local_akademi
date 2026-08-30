import React from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import styles from './MentorEmptyState.module.css';

/* `getQuickStartsByRole` bileşen dışından da (test, olası başka
   tüketici) çağrılabiliyor — bu yüzden hook değil, i18next tekil
   örneğinin `t`sini doğrudan kullanır. Aktif arayüz diline göre
   çevrilmiş döner. */
function quickStartsKeyFor(role) {
  if (role === 'esnaf' || role === 'merchant') return 'esnaf';
  if (role === 'girisimci' || role === 'entrepreneur') return 'girisimci';
  if (role === 'yatirimci' || role === 'investor') return 'yatirimci';
  return 'default';
}

export function getQuickStartsByRole(role) {
  const group = quickStartsKeyFor(role);
  return ['q1', 'q2', 'q3', 'q4'].map(q => i18n.t(`mentor:quickStarts.${group}.${q}`));
}

export default function MentorEmptyState({ onQuickStart, role }) {
  const { t } = useTranslation('mentor');
  const quickStarts = getQuickStartsByRole(role);

  return (
    <div className={`flex flex-col items-center justify-center h-full p-6 text-center ${styles.wrap}`}>
      <div className={styles.icon}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </div>
      <h3 className={`text-lg font-semibold text-[var(--text)] mb-2 ${styles.title}`}>
        {t('emptyState.title')}
      </h3>
      <p className={`text-sm text-[var(--text-light)] mb-8 max-w-sm ${styles.subtitle}`}>
        {t('emptyState.subtitle')}
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
