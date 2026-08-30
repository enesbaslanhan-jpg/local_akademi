import { useTranslation } from 'react-i18next';
import styles from './MentorBetaBadge.module.css';

export default function MentorBetaBadge() {
  const { t } = useTranslation('mentor');
  return (
    <div className={styles.wrapper}>
      <span
        className={styles.badge}
        aria-describedby="mentor-beta-tooltip"
        tabIndex="0"
      >
        Beta
      </span>
      <div id="mentor-beta-tooltip" role="tooltip" className={styles.tooltip}>
        {t('beta.tooltip')}
      </div>
    </div>
  );
}
