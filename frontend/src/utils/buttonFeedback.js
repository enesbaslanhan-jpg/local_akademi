/*
 * Buton geri bildirimi: basış sınıfı + kısa tıklama sesi.
 *
 * SES BİLİNÇLİ BİR TERCİHTİR — ürün sahibi açıkça istedi (2026-08-13).
 * Onaylanan 18 ekranlık tasarım dosyasında sesten söz edilmemesi onu
 * gereksiz yapmaz; kaldırmayın.
 *
 * Buradaki `data-tactile` sınıflandırması ayrı bir konu: buttons.css onu
 * attribute seçicileriyle kullanıyor ve bileşenlerin kendi stilini
 * ezebiliyor. O katman Faz C'de ele alınacak; ses tarafı korunacak.
 */
let installed = false
let audioContext = null
let lastSoundAt = 0
const PRESS_CLASS = 'is-tactile-pressed'

function classifyButton(button) {
  if (!(button instanceof HTMLButtonElement)) return

  const ownClass = typeof button.className === 'string' ? button.className : ''
  const label = (button.textContent || '').replace(/\s+/g, ' ').trim()
  const isDanger = /(?:danger|delete|remove|archive|reject|destructive)/i.test(ownClass)
    || /^(sil|kaldır|arşivle|reddet)$/i.test(label)
  const isSecondary = /(?:secondary|outline|ghost|cancel)/i.test(ownClass)
    || /^(iptal|vazgeç|kapat|geri)$/i.test(label)
  const isNavigation = Boolean(
    button.closest('nav, [role="navigation"], [class*="_tabs_"], [class*="_navigation_"], [class*="_filters_"], [class*="_back_"]')
    || button.getAttribute('role') === 'tab'
    || button.hasAttribute('aria-current')
    || button.hasAttribute('aria-pressed')
    || /(?:tab|chip|toggle|card|link|nav|item|icon|filter|pagination|back|close|preview|memory|launcher|avatar|panel-tool)/i.test(ownClass)
  )
  const isIconOnly = Boolean(button.getAttribute('aria-label') && label.length === 0)

  button.dataset.tactile = isDanger
    ? 'danger'
    : isSecondary
      ? 'secondary'
      : (isNavigation || isIconOnly)
        ? 'control'
        : 'action'
}

function scanButtons(root = document) {
  if (root instanceof HTMLButtonElement) classifyButton(root)
  root.querySelectorAll?.('button').forEach(classifyButton)
}

function releaseButton(button) {
  window.setTimeout(() => button?.classList.remove(PRESS_CLASS), 95)
}

function playClickSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext
  if (!AudioContext) return

  const now = performance.now()
  if (now - lastSoundAt < 35) return
  lastSoundAt = now

  try {
    audioContext ||= new AudioContext()
    if (audioContext.state === 'suspended') void audioContext.resume().catch(() => {})

    const startedAt = audioContext.currentTime
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(155, startedAt)
    oscillator.frequency.exponentialRampToValueAtTime(105, startedAt + .045)
    gain.gain.setValueAtTime(.018, startedAt)
    gain.gain.exponentialRampToValueAtTime(.0001, startedAt + .05)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start(startedAt)
    oscillator.stop(startedAt + .052)
  } catch {
    // Ses desteği bulunmayan veya engellenen ortamlarda görsel geri bildirim sürer.
  }
}

export function installButtonFeedback() {
  if (installed || typeof document === 'undefined') return
  installed = true

  scanButtons()
  const observer = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node instanceof Element) scanButtons(node)
    }))
  })
  observer.observe(document.body, { childList: true, subtree: true })

  document.addEventListener('pointerdown', event => {
    const button = event.target.closest?.('button')
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return
    classifyButton(button)
    button.classList.add(PRESS_CLASS)
  }, true)

  document.addEventListener('pointerup', event => releaseButton(event.target.closest?.('button')), true)
  document.addEventListener('pointercancel', event => releaseButton(event.target.closest?.('button')), true)

  document.addEventListener('click', event => {
    if (!event.isTrusted) return
    const button = event.target.closest?.('button')
    if (!button || button.disabled || button.getAttribute('aria-disabled') === 'true') return
    classifyButton(button)
    playClickSound()
  }, true)
}
