/*
 * LocalKarar marka işareti — pusula iğnesi + C/K monogramı.
 *
 * Gerçek marka asset'i (vektör/PNG) henüz projeye eklenmediği için burada
 * geçici ama temiz bir inline SVG monogram kullanılıyor: dış halka (pusula
 * kadranı), içeride kuzey-güney yönünü gösteren iğne ve C harfini anımsatan
 * açık yay. Asset geldiğinde yalnızca bu dosya değiştirilecek.
 */
export default function BrandMark({ size = 28, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      className={className}
      role="img"
      aria-label="LocalKarar"
    >
      <rect width="40" height="40" rx="10" fill="#1E453D" />
      {/* Pusula kadranı — C harfini anımsatan açık yay */}
      <path
        d="M28.5 12.5a11 11 0 1 0 0 15"
        stroke="#F1F6F7"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* Pusula iğnesi — K harfinin çapraz kolunu da temsil eder */}
      <path
        d="M20 11.5 24.5 20 20 28.5 15.5 20Z"
        fill="var(--accent-500)"
      />
      <circle cx="20" cy="20" r="2.1" fill="#F1F6F7" />
    </svg>
  )
}
