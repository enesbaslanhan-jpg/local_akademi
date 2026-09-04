import { useEffect, useLayoutEffect, useRef, useState } from 'react'

/*
 * Öğe görünüme girdiğinde bir kez `true` döner.
 *
 * DESIGN.md §23.3 gereği kaydırma animasyonları içeriğin ÖNKOŞULU olamaz:
 * JavaScript çalışmazsa ya da IntersectionObserver desteklenmiyorsa hook
 * doğrudan `true` döner ve içerik animasyonsuz ama EKSİKSİZ görünür.
 *
 * `prefers-reduced-motion: reduce` seçiliyse de anında `true` döner —
 * animasyon yavaşlatılmaz, hiç oynatılmaz (§23.2).
 *
 * Bir kez tetiklenip gözlemi bırakır: kullanıcı yukarı kaydırdığında
 * içeriğin tekrar kaybolup belirmesi rahatsız edici olurdu.
 *
 * 🔴 YALNIZ IntersectionObserver'A GÜVENİLMİYOR — VE BU KRİTİK.
 *
 * IO, öğe iki gözlem karesi ARASINDA görünüme girip çıkarsa hiç kesişme
 * bildirmez. Sayfa ortasına atlayan bir bağlantı, hızlı kaydırma ya da
 * `scrollTo` çağrısı bunu tetikler; öğe bir daha asla açılmaz ve
 * kullanıcı BOŞ SAYFA görür. Ölçüldü: 900px'lik anlık sıçramada on
 * bölümün onu da gizli kaldı.
 *
 * Bu yüzden konum ayrıca ELLE kontrol ediliyor: öğe görünümün üstünde
 * kaldıysa (yani kullanıcı onu çoktan geçtiyse) doğrudan açılır.
 */
export function useGorunumeGirince(options = {}) {
  const ref = useRef(null)

  const [gorundu, setGorundu] = useState(() => {
    if (typeof window === 'undefined') return true
    if (typeof IntersectionObserver === 'undefined') return true
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  })

  /* Boyama öncesi konum kontrolü: ilk çizimde zaten görünür olan ya da
     geçilmiş bölümler için animasyon hiç başlamaz, titreme olmaz. */
  useLayoutEffect(() => {
    if (gorundu) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) setGorundu(true)
  }, [gorundu])

  useEffect(() => {
    if (gorundu) return
    const el = ref.current
    if (!el) return

    const gozlemci = new IntersectionObserver(
      (girisler) => {
        const g = girisler[girisler.length - 1]
        /* `top <= 0`: IO'nun kaçırdığı sıçramalarda öğe görünümün
           üstünde kalmış olur; bunu da "görüldü" saymak, kalıcı gizli
           içerik ihtimalini ortadan kaldırır. */
        if (g.isIntersecting || g.boundingClientRect.top <= 0) {
          setGorundu(true)
          gozlemci.disconnect()
        }
      },
      {
        rootMargin: options.rootMargin ?? '0px 0px -12% 0px',
        threshold: options.threshold ?? 0.15,
      },
    )

    gozlemci.observe(el)

    /* Son güvenlik ağı: kaydırma sırasında da konum kontrol edilir.
       `passive` — kaydırma performansını etkilemez. */
    const kontrol = () => {
      const el2 = ref.current
      if (!el2) return
      if (el2.getBoundingClientRect().top < window.innerHeight) {
        setGorundu(true)
        gozlemci.disconnect()
        window.removeEventListener('scroll', kontrol)
      }
    }
    window.addEventListener('scroll', kontrol, { passive: true })

    return () => {
      gozlemci.disconnect()
      window.removeEventListener('scroll', kontrol)
    }
  }, [gorundu, options.rootMargin, options.threshold])

  return [ref, gorundu]
}
