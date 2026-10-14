import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import KararRehberPage from '@/pages/KararRehberPage'
import FeaturePage from '@/pages/FeaturePage'
import { KARAR_REHBERLERI } from '@/content/karar-rehberleri'
import { ThemeProvider } from '@/context/ThemeContext'
import { SAYFA_META } from '@/config/sayfa-meta'

/*
 * Karar rehberi sayfaları: her biri kendi başlığını, formülünü, çözümlü
 * örneğini ve SSS'sini gösterir; bilinmeyen adres karar araçları sayfasına döner.
 */

function ciz(yol) {
  return render(
    <ThemeProvider><MemoryRouter initialEntries={[yol]}>
      <Routes>
        <Route path="/karar-araclari/:slug" element={<KararRehberPage />} />
        <Route path="/karar-araclari" element={<FeaturePage slug="karar-araclari" />} />
      </Routes>
    </MemoryRouter></ThemeProvider>
  )
}

describe('KararRehberPage', () => {
  for (const [slug, r] of Object.entries(KARAR_REHBERLERI)) {
    it(`${slug}: başlık, örnek ve SSS görünür; sekme başlığı tablodan`, () => {
      ciz(`/karar-araclari/${slug}`)
      expect(screen.getByRole('heading', { level: 1, name: r.baslik })).toBeInTheDocument()
      expect(screen.getByText(r.ornek.sonuc)).toBeInTheDocument()
      expect(screen.getByText(r.sss[0][0])).toBeInTheDocument()
      expect(document.title).toBe(SAYFA_META[`/karar-araclari/${slug}`].baslik)
    })
  }

  it('bilinmeyen rehber adresi karar araçları sayfasına döner', () => {
    ciz('/karar-araclari/yok-boyle-bir-sey')
    expect(screen.getByRole('heading', { level: 1, name: /kararlarını tahminle değil/i })).toBeInTheDocument()
  })

  it('karar araçları sayfası beş rehbere bağlanır', () => {
    ciz('/karar-araclari')
    for (const r of Object.values(KARAR_REHBERLERI)) {
      expect(screen.getByRole('link', { name: new RegExp(r.baslik.replace('?', '\\?')) })).toBeInTheDocument()
    }
  })
})
