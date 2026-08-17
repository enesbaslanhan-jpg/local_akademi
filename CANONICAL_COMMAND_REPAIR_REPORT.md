# CANONICAL LaTeX COMMAND REPAIR — UYGULAMA RAPORU

**Tarih:** 2026-08-17T12:28:39.056Z
**Uygulama modu:** apply
**Kapsam:** Yalnız canonical-v1 (38 ders) `knowledge_object.content`. Legacy verisine dokunulmadı. Yeniden import YOK. Phase B YOK. Progress remap YOK. git add/commit/push YAPILMADI.

## Kök Neden
TAB/CR patch'i kontrol karakterlerini `\`'ye çevirdi ancak JSON escape'inin yuttuğu harfi geri getiremedi:
- `\text` -> TAB+"ext" -> `\ext` (252 adet, eksik 't')
- `\times` -> TAB+"imes" -> `\imes` (29 adet, eksik 't')
- `\right` -> CR+"ight" -> `\ight` (8 adet, eksik 'r')

DB'de çift-backslash doğrulanarak yoktu; bozuk komutların tamamı standart LaTeX bağlamındaydı — onarım deterministik.

## Yapılan Değişiklikler (apply)
- DB: `\ext`->`\text`, `\imes`->`\times`, `\ight`->`\right` (yalnız CANON-COURSE-% içeriği, tek transaction).

## Sonuç Durumu
- Onarılan KO: 14
- Kalan bozuk komut: 0
- Kalan kontrol karakteri: 0
- Doğru LaTeX komutu: text=646 times=91 right=13 (toplam 750)

## Sonuç
- Onarım durumu: PASS
