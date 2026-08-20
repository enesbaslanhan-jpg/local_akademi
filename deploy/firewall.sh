#!/usr/bin/env bash
#
# Guvenlik duvari — 80/443 YALNIZ Cloudflare'dan.
#
# NEDEN KRITIK: uygulama `X-Forwarded-For` basligindan istemci IP'sini
# okuyor ve IP tabanli hiz sinirlari (giris, kayit, sifre sifirlama)
# buna dayaniyor. Sunucunun gercek IP'sine DOGRUDAN ulasabilen biri
# bu basligi uydurup butun hiz sinirlarini asabilir.
#
# Bu daha once olculmustu: TRUST_PROXY=true iken sahte baslikla
# 3/saat sinirinda 6/6 istek gecmisti.
#
# Cloudflare disindan 80/443'e erisim kapatilinca basligi uydurabilecek
# kimse kalmiyor: tek giris yolu Cloudflare ve o, basligi kendi yaziyor.
#
# Kullanim:  sudo bash deploy/firewall.sh
set -euo pipefail

echo "==> Cloudflare IP araliklari cekiliyor"
V4=$(curl -fsS https://www.cloudflare.com/ips-v4)
V6=$(curl -fsS https://www.cloudflare.com/ips-v6)

if [ -z "$V4" ]; then
  echo "HATA: Cloudflare IP listesi alinamadi. Kurulum durduruldu." >&2
  exit 1
fi

echo "==> Varsayilan kurallar"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

echo "==> SSH (once bu, yoksa kendini disarida birakirsin)"
ufw allow 22/tcp comment 'SSH'

echo "==> 80/443 yalniz Cloudflare"
for ip in $V4 $V6; do
  ufw allow from "$ip" to any port 80  proto tcp comment 'Cloudflare'
  ufw allow from "$ip" to any port 443 proto tcp comment 'Cloudflare'
done

echo "==> Uygulama portu (3000) disariya KAPALI kaliyor"
# Acik kural yok = varsayilan deny. Caddy ayni Docker aginda oldugu
# icin uygulamaya erisimi guvenlik duvarindan gecmiyor.

ufw --force enable
ufw status numbered

cat <<'NOT'

TAMAM.

Dikkat: Cloudflare IP araliklari zaman zaman degisiyor. Bu betigi
ayda bir calistirmak (ya da cron'a koymak) mantikli. Aralik degisip
de guncellenmezse site bir anda erisilemez olur -- belirtisi: Cloudflare
"Error 522" gosterir.
NOT
