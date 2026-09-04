import { useGorunumeGirince } from '@/hooks/useGorunumeGirince'
import styles from './Acilis.module.css'

/*
 * Kaydırma açılışı — DESIGN.md §23.1.
 *
 * Sarmaladığı içerik görünüme girdiğinde yumuşakça belirir. Yalnız
 * herkese açık tanıtım sayfalarında kullanılır; §23 kapsamı dışında
 * (yani `/app/**` içinde) kullanılmaz.
 *
 * `gecikme` aynı bölümdeki kartları sırayla açmak için: 0, 1, 2...
 * Milisaniye değil ADIM alır; adım süresi CSS'te tek yerde tanımlı,
 * böylece sayfa sayfa farklı ritimler oluşmaz.
 *
 * ⚠️ Animasyon içeriğin önkoşulu DEĞİL (§23.3): JavaScript ya da
 * IntersectionObserver yoksa, veya kullanıcı hareketi kısıtlamışsa
 * içerik doğrudan görünür halde çizilir.
 */
export default function Acilis({
  children,
  gecikme = 0,
  as: Etiket = 'div',
  className = '',
  style,
  ...rest
}) {
  const [ref, gorundu] = useGorunumeGirince()

  /*
   * 🔴 className VE style AYRICA ALINIYOR, `rest` icinde birakilmiyor.
   * Once `{...rest}` en sonda yayiliyordu ve cagiranin className'i
   * bileşenin kendi acilis sinifini EZIYORDU -- animasyon hic
   * uygulanmiyordu (DOM'da tek bir acilis sinifi yoktu, olculdu).
   */
  return (
    <Etiket
      ref={ref}
      className={[styles.acilis, gorundu ? styles.gorundu : '', className].filter(Boolean).join(' ')}
      style={gecikme ? { ...style, '--acilis-gecikme': `${gecikme}` } : style}
      {...rest}
    >
      {children}
    </Etiket>
  )
}
