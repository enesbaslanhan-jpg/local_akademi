import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PasswordInput from './PasswordInput'

/*
 * Göster/gizle düğmesinin iki sessiz kırılma noktası var; ikisi de burada
 * tutuluyor:
 *
 *   1. Düğme `type="button"` olmazsa form içinde varsayılan `submit`'tir.
 *      Kullanıcı şifresini görmek isterken formu gönderir. Görsel olarak
 *      fark edilmez, çünkü ikon yine değişir.
 *   2. Görünürlük bileşen dışında tutulursa aynı formdaki iki alan
 *      (yeni şifre / tekrar) birlikte açılır. Kullanıcı birini gösterirken
 *      diğerini de istemeden ifşa eder.
 */
describe('PasswordInput', () => {
  it('varsayılan olarak şifreyi gizler', () => {
    render(<PasswordInput aria-label="Şifre" defaultValue="gizli" />)
    expect(screen.getByLabelText('Şifre')).toHaveAttribute('type', 'password')
  })

  it('düğmeye basınca metne çevirir, tekrar basınca geri gizler', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Şifre" defaultValue="gizli" />)
    const alan = screen.getByLabelText('Şifre')

    await user.click(screen.getByRole('button', { name: 'Şifreyi göster' }))
    expect(alan).toHaveAttribute('type', 'text')

    await user.click(screen.getByRole('button', { name: 'Şifreyi gizle' }))
    expect(alan).toHaveAttribute('type', 'password')
  })

  it('aria-pressed görünürlüğü yansıtır', async () => {
    const user = userEvent.setup()
    render(<PasswordInput aria-label="Şifre" />)
    const dugme = screen.getByRole('button')

    expect(dugme).toHaveAttribute('aria-pressed', 'false')
    await user.click(dugme)
    expect(dugme).toHaveAttribute('aria-pressed', 'true')
  })

  it('formu GÖNDERMEZ — düğme submit değil', async () => {
    const user = userEvent.setup()
    const gonderildi = vi.fn(event => event.preventDefault())

    render(
      <form onSubmit={gonderildi}>
        <PasswordInput aria-label="Şifre" />
      </form>
    )

    await user.click(screen.getByRole('button'))
    expect(gonderildi).not.toHaveBeenCalled()
  })

  it('iki alan birbirinden bağımsız açılır', async () => {
    const user = userEvent.setup()
    render(
      <>
        <PasswordInput aria-label="Yeni şifre" />
        <PasswordInput aria-label="Yeni şifre tekrar" />
      </>
    )

    await user.click(screen.getAllByRole('button')[0])

    expect(screen.getByLabelText('Yeni şifre')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Yeni şifre tekrar')).toHaveAttribute('type', 'password')
  })
})
