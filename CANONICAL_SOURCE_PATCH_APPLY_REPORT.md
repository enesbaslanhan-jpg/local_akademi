# CANONICAL SOURCE PATCH — UYGULAMA RAPORU

**Tarih:** 2026-08-17T11:08:38.248Z
**Uygulama modu:** apply
**Kapsam:** Yalnız canonical-v1 (38 ders). Legacy verisine dokunulmadı. Phase B çalıştırılmadı. Progress remap yapılmadı. git add/commit/push yapılmadı.

## Patch Girdileri
- Deep-link duzeltmesi (SOURCE_DEEP_LINK_PATCH.json): 35
- Icerik duzeltmesi (CANONICAL_SOURCE_CONTENT_PATCH.json): 7 (4 REPLACE + 3 REMOVE)

## Yapilan Degisiklikler
- Source satiri guncellendi (in-place): 38
- Source satiri olusturuldu: 2
- Source satiri silindi (yetim): 4
- Source iliskisi replace edildi: 4
- Source iliskisi kaldirildi (REMOVE): 3

## Sonuc Durumu
- Canonical kurs sayisi: 38
- Canonical KO sayisi: 38
- Canonical source baglantisi: 77 (beklenen 77)
- Broken canonical URL: 0
- Nonexistent canonical source: 0
- Claim/source mismatch: 0
- Legacy iliskisi degisimi: 0 (once 3616, sonra 3616)
- DB vs canonical JSON farki: 0 (beklenen 0)

## Smoke Test (DB seviyesi)
CANON-COURSE-001 (2 kaynak):
  - T.C. Gelir İdaresi Başkanlığı - Vergi Usul Kanunu | https://www.mevzuat.gov.tr/mevzuat?MevzuatNo=213&MevzuatTur=1&MevzuatTertip=4
  - Sosyal Güvenlik Kurumu | https://www.sgk.gov.tr/
CANON-COURSE-021 (3 kaynak):
  - Gelir İdaresi Başkanlığı (GİB) - Gelir Vergisi Tarifesi | https://www.gib.gov.tr/yardim-kaynaklar/yararli-bilgiler/gelir-vergisi-tarifesi
  - T.C. Ticaret Bakanlığı - Esnaf ve Şirket Kuruluş Rehberi | https://www.ticaret.gov.tr
  - 6102 Sayılı Türk Ticaret Kanunu (TTK) | https://www.mevzuat.gov.tr/Metin1.Aspx?MevzuatKod=1.5.6102&MevzuatIliski=0&sourceXmlSearch=&Tur=1&Tertip=5&No=6102
CANON-COURSE-032 (2 kaynak):
  - TCMB Sermaye Hareketleri Genelgesi | https://www.tcmb.gov.tr
  - T.C. Hazine ve Maliye Bakanlığı | https://www.hmb.gov.tr

## Smoke Test (API seviyesi — CoursePlayer'ın kullandığı uçtan)
`GET /courses/:id/lessons/:lessonId` (CoursePlayerPage'in kaynak kartları bu uçtan beslenir; `ko.sources[].source` dahil edilir):
- CANON-COURSE-001 (course 439): 2 kaynak kartı — VUK deep link (mevzuat.gov.tr) + SGK. OK
- CANON-COURSE-021 (course 459): 3 kaynak kartı — GİB tarifesi deep link, Ticaret Bakanlığı, TTK deep link. OK
- CANON-COURSE-032 (course 470): 2 kaynak kartı — TCMB + HMB (patch kapsamı dışındaki kontrol dersi, değişmedi). OK
- Kaynak kartlarında authorityLevel=high korunuyor; "Kaynağa Git" URL'leri yeni deep link'leri gösteriyor.

## Sonuc
- Patch durumu: PASS
- Son gorsel QA icin guvenli: EVET
- Phase B icin guvenli: EVET
