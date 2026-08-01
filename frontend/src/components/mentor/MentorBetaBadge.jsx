import styles from './MentorBetaBadge.module.css';

export default function MentorBetaBadge() {
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
        AI Mentor yanıtları bilgilendirme amaçlıdır. Önemli işletme kararlarında bilgileri doğrulayın.
      </div>
    </div>
  );
}
