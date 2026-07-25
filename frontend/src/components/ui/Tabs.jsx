import styles from './Tabs.module.css'

export default function Tabs({ tabs = [], activeTab, onChange, className = '' }) {
  return (
    <div className={`${styles.tabs} ${className}`} role="tablist">
      {tabs.map(tab => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={activeTab === tab.id}
          className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => onChange?.(tab.id)}
        >
          {tab.icon && <span className={styles.icon}>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span className={styles.count}>{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  )
}
