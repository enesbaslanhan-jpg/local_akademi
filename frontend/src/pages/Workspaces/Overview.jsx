import { useWorkspace } from '@/context/WorkspaceContext'
import styles from './Overview.module.css'

export default function Overview() {
  const { activeWorkspace } = useWorkspace()
  if (!activeWorkspace) return <p>Yükleniyor...</p>

  const ws = activeWorkspace
  const sales = ws.monthlySales || 0
  const expenses = ws.monthlyExpenses || 0
  const profit = sales - expenses

  return (
    <div className={styles.grid}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Aylık Satış</div>
        <div className={styles.cardValue}>{sales.toLocaleString('tr-TR')} {ws.currency}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Aylık Gider</div>
        <div className={styles.cardValue}>{expenses.toLocaleString('tr-TR')} {ws.currency}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Tahmini Kâr</div>
        <div className={styles.cardValue}>{profit.toLocaleString('tr-TR')} {ws.currency}</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardTitle}>Nakit / Borç</div>
        <div className={styles.cardValue}>{(ws.cashBalance || 0).toLocaleString('tr-TR')} / {(ws.debtBalance || 0).toLocaleString('tr-TR')} {ws.currency}</div>
      </div>

      <div className={`${styles.card} ${styles.fullWidth}`}>
        <div className={styles.cardTitle}>İşletme Bilgileri</div>
        <div className={styles.row}><span className={styles.label}>İşletme Adı</span><span>{ws.name}</span></div>
        {ws.legalName && <div className={styles.row}><span className={styles.label}>Unvan</span><span>{ws.legalName}</span></div>}
        <div className={styles.row}><span className={styles.label}>Sektör</span><span>{ws.sector || '-'}</span></div>
        <div className={styles.row}><span className={styles.label}>Şehir</span><span>{ws.city || '-'}</span></div>
        <div className={styles.row}><span className={styles.label}>Para Birimi</span><span>{ws.currency}</span></div>
        {ws.businessStage && <div className={styles.row}><span className={styles.label}>Aşama</span><span>{ws.businessStage}</span></div>}
        {ws.employeeCount != null && <div className={styles.row}><span className={styles.label}>Çalışan</span><span>{ws.employeeCount}</span></div>}
        {ws.primaryGoal && <div className={styles.row}><span className={styles.label}>Öncelikli Hedef</span><span>{ws.primaryGoal}</span></div>}
      </div>
    </div>
  )
}
