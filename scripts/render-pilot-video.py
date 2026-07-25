"""Render the first LocalAkademi narrated pilot video.

This prototype intentionally remains provider-neutral: replace Edge TTS with the
production TTS adapter later. It writes a QA preview and never publishes to DB.
"""

from __future__ import annotations

import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".video-tools"))

import edge_tts  # type: ignore
import imageio_ffmpeg  # type: ignore
from PIL import Image, ImageDraw, ImageFont


CODE = "CUR-001-01"
TITLE = "Nakit Akışı"
VOICE = "tr-TR-EmelNeural"
WIDTH, HEIGHT = 1920, 1080
FPS = 30
WORK = ROOT / ".video-work" / CODE
OUTPUT_DIR = ROOT / "frontend" / "public" / "media" / "videos"
OUTPUT = OUTPUT_DIR / f"{CODE}.mp4"
VTT_OUTPUT = OUTPUT_DIR / f"{CODE}.vtt"
THUMBNAIL = OUTPUT_DIR / f"{CODE}.png"

SCENES = [
    {
        "title": "Kâr Var, Nakit Yok Olabilir",
        "eyebrow": "1 · TEMEL FARK",
        "bullets": ["Kâr, gelir ve giderlerin sonucudur.", "Nakit akışı, paranın ne zaman girip çıktığını gösterir.", "Vadesi gelmemiş satış, kasadaki para değildir."],
        "narration": "Bir işletme kârlı göründüğü hâlde ödeme güçlüğü yaşayabilir. Çünkü kâr ile nakit aynı şey değildir. Vadeli bir satış gelir yaratır; fakat müşteri henüz ödeme yapmadıysa kasaya nakit girmez. Nakit akışı, işletmeye giren ve işletmeden çıkan parayı tarihleriyle birlikte izleyerek bu farkı görünür hâle getirir.",
    },
    {
        "title": "Basit Nakit Akış Tablosu",
        "eyebrow": "2 · ÜÇ SATIRLIK MODEL",
        "bullets": ["Dönem başı nakit", "+ Dönem içi nakit girişleri", "− Dönem içi nakit çıkışları", "= Dönem sonu nakit"],
        "narration": "En basit nakit akış tablosu dört parçadan oluşur. Dönem başındaki nakdi yazın. Tahsilat, peşin satış ve diğer nakit girişlerini ekleyin. Kira, maaş, tedarikçi, vergi ve kredi ödemeleri gibi çıkışları çıkarın. Kalan tutar dönem sonu nakdinizdir. Bu tabloyu haftalık hazırlamak, yaklaşan açığı ödeme gününden önce görmenizi sağlar.",
    },
    {
        "title": "Nakit Nereden Geldi?",
        "eyebrow": "3 · ÜÇ FAALİYET SINIFI",
        "bullets": ["Esas faaliyet: müşteri, tedarikçi, çalışan", "Yatırım: makine ve uzun vadeli varlıklar", "Finansman: kredi, sermaye ve anapara", "Toplam artış tek başına başarı göstergesi değildir."],
        "narration": "Bir sonraki adım, parayı kaynağına göre ayırmaktır. Müşteri tahsilatı ile tedarikçi ve çalışan ödemeleri esas faaliyettir. Makine ve uzun vadeli varlık alımları yatırım faaliyetidir. Kredi kullanımı, sermaye girişi ve kredi anapara ödemesi finansman faaliyetidir. Banka bakiyesi kredi sayesinde artmışsa, bu ana işin nakit ürettiği anlamına gelmez. Bu nedenle toplam değişim kadar değişimin kaynağını da okuyun.",
    },
    {
        "title": "Kısa Bir İşletme Örneği",
        "eyebrow": "4 · SAYISAL UYGULAMA",
        "bullets": ["Başlangıç: 50.000 TL", "Tahsilatlar: +80.000 TL", "Ödemeler: −100.000 TL", "Dönem sonu: 30.000 TL"],
        "narration": "Örneğin işletmenin haftaya elli bin lira ile başladığını düşünelim. Hafta içinde seksen bin lira tahsilat yapılıyor ve yüz bin lira ödeme gerçekleştiriliyor. Dönem sonu nakit, elli bin artı seksen bin eksi yüz bin hesabıyla otuz bin liradır. Sonuç pozitiftir; ancak gelecek haftanın ödemeleri kırk bin liraysa şimdiden on bin liralık bir açık riski vardır.",
    },
    {
        "title": "Ay Sonu Pozitif Olsa Bile",
        "eyebrow": "5 · ZAMANLAMA RİSKİ",
        "bullets": ["1. hafta kapanış: 30.000 TL", "2. hafta kapanış: −15.000 TL", "3. hafta kapanış: 50.000 TL", "Kritik bilgi: ilk açığın tarihi ve tutarı"],
        "narration": "Şimdi dört haftalık bir tahmine bakalım. Birinci hafta otuz bin lira ile kapanıyor. İkinci hafta tahsilat kırk beş bin, ödeme doksan bin lira olunca bakiye eksi on beş bin liraya düşüyor. Üçüncü haftadaki büyük tahsilatla yeniden elli bin liraya çıkıyor. Ay sonu pozitif görünse bile ikinci haftada ödeme güçlüğü vardır. Bu yüzden yalnızca aylık toplamı değil, ilk açığın tarihini, en düşük bakiyeyi ve açığın ne kadar sürdüğünü izleyin.",
    },
    {
        "title": "Dört Adımda Uygulama",
        "eyebrow": "6 · HAFTALIK RUTİN",
        "bullets": ["1. Banka ve kasa bakiyesini doğrula", "2. Tahsilatları vade tarihine yerleştir", "3. Ödemeleri son ödeme gününe yerleştir", "4. Tahmin–gerçekleşen farkını açıkla"],
        "narration": "Uygulama için önce banka ve kasa bakiyesini doğrulayın. Beklenen tahsilatları müşterinin söz verdiği tarihe göre tabloya yerleştirin. Tedarikçi, maaş, vergi ve kredi ödemelerini son ödeme günleriyle ekleyin. Her hafta sonunda tahmin ile gerçekleşeni karşılaştırın. Farkın nedenini yazın ve gelecek haftanın tahminini bu bilgiyle güncelleyin.",
    },
    {
        "title": "Sık Yapılan Hatalar",
        "eyebrow": "7 · RİSK KONTROLÜ",
        "bullets": ["Satış tutarını tahsil edilmiş saymak", "KDV ve vergi ödemelerini unutmak", "Kişisel harcamalarla işletme nakdini karıştırmak", "Yalnızca aylık toplamı izlemek"],
        "narration": "En yaygın hata, yapılan satışı hemen nakit girişi kabul etmektir. İkinci hata vergi, komisyon ve kredi taksitlerini tabloya geç eklemektir. İşletme hesabıyla kişisel harcamaların karışması da görünümü bozar. Son olarak yalnızca aylık toplamı izlemek, ay içindeki kritik ödeme günlerini gizleyebilir. Bu nedenle nakit planı tarih bazlı ve düzenli güncellenmelidir.",
    },
    {
        "title": "Tahmininizi Stres Testine Sokun",
        "eyebrow": "8 · KARAR ALIŞTIRMASI",
        "bullets": ["En büyük tahsilatı 7 gün geciktirin.", "En büyük değişken gideri %10 artırın.", "Yeni en düşük bakiyeyi hesaplayın.", "Birincil ve yedek önlem belirleyin."],
        "narration": "Tek bir iyimser tahmine güvenmeyin. En büyük müşteri tahsilatını yedi gün geciktirin ve en büyük değişken giderinizi yüzde on artırın. Yeni en düşük bakiyeyi hesaplayın. Sonra seçenekleri hız, nakit etkisi, maliyet ve ilişki riskiyle karşılaştırın. Önce veriyi doğrulayın; ardından tahsilatı hızlandırma, ertelenebilir harcama, ticari vade ve gerekiyorsa finansman seçeneklerini sıralayın. Bugünkü finansmanın gelecekteki geri ödemesini de projeksiyona eklemeyi unutmayın.",
    },
    {
        "title": "Bugün Atacağınız İlk Adım",
        "eyebrow": "9 · UYGULAMA GÖREVİ",
        "bullets": ["Önümüzdeki 4 haftayı açın.", "Kesin giriş ve çıkışları tarihleriyle yazın.", "En düşük bakiye görülen haftayı işaretleyin.", "Açık varsa tahsilat veya ödeme planı oluşturun."],
        "narration": "Şimdi önünüzdeki dört hafta için basit bir tablo açın. Kesinleşmiş nakit girişlerini ve çıkışlarını tarihleriyle yazın. Her haftanın tahmini kapanış bakiyesini hesaplayın ve en düşük bakiyeyi gördüğünüz haftayı işaretleyin. Bir açık görünüyorsa tahsilatı hızlandırma, ödemeyi yeniden planlama veya finansman ihtiyacını önceden değerlendirme adımını belirleyin.",
    },
]


def font(size: int, bold: bool = False):
    names = ["seguisb.ttf" if bold else "segoeui.ttf", "arialbd.ttf" if bold else "arial.ttf"]
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


def wrap(draw: ImageDraw.ImageDraw, value: str, selected_font, max_width: int) -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=selected_font)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def render_slide(scene: dict, index: int, target: Path) -> None:
    image = Image.new("RGB", (WIDTH, HEIGHT), "#071426")
    draw = ImageDraw.Draw(image)
    for y in range(HEIGHT):
        ratio = y / HEIGHT
        draw.line((0, y, WIDTH, y), fill=(7, int(20 + 18 * ratio), int(38 + 30 * ratio)))

    draw.rounded_rectangle((105, 90, 1815, 990), radius=42, fill="#0d213b", outline="#214a73", width=3)
    draw.rounded_rectangle((105, 90, 126, 990), radius=10, fill="#2dd4bf")
    draw.text((175, 145), scene["eyebrow"], font=font(34, True), fill="#5eead4")

    y = 225
    title_font = font(74, True)
    for line in wrap(draw, scene["title"], title_font, 1450):
        draw.text((175, y), line, font=title_font, fill="#f8fafc")
        y += 92

    y += 35
    body_font = font(42)
    for bullet in scene["bullets"]:
        lines = wrap(draw, bullet, body_font, 1380)
        draw.ellipse((185, y + 18, 203, y + 36), fill="#2dd4bf")
        for line_index, line in enumerate(lines):
            draw.text((235, y + line_index * 58), line, font=body_font, fill="#dbeafe")
        y += max(76, len(lines) * 58 + 20)

    draw.text((175, 930), "LOCALAKADEMİ  ·  TEMEL FİNANS", font=font(25, True), fill="#7dd3fc")
    draw.text((1410, 930), f"{index + 1} / {len(SCENES)}", font=font(25, True), fill="#94a3b8")
    image.save(target, quality=95)


async def synthesize(text_value: str, target: Path) -> None:
    communicator = edge_tts.Communicate(text_value, VOICE, rate="-4%", volume="+0%")
    await communicator.save(str(target))


def duration(ffmpeg: str, media: Path) -> float:
    result = subprocess.run([ffmpeg, "-i", str(media)], capture_output=True, text=True, encoding="utf-8", errors="replace")
    match = re.search(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)", result.stderr)
    if not match:
        raise RuntimeError(f"Could not read duration: {media}")
    hours, minutes, seconds = match.groups()
    return int(hours) * 3600 + int(minutes) * 60 + float(seconds)


def timestamp(seconds: float) -> str:
    millis = round(seconds * 1000)
    hours, remainder = divmod(millis, 3_600_000)
    minutes, remainder = divmod(remainder, 60_000)
    secs, ms = divmod(remainder, 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{ms:03d}"


async def main() -> None:
    WORK.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
    segments: list[Path] = []
    durations: list[float] = []

    for index, scene in enumerate(SCENES):
        slide = WORK / f"scene-{index + 1:02d}.png"
        audio = WORK / f"scene-{index + 1:02d}.mp3"
        segment = WORK / f"scene-{index + 1:02d}.mp4"
        render_slide(scene, index, slide)
        await synthesize(scene["narration"], audio)
        scene_duration = duration(ffmpeg, audio)
        durations.append(scene_duration)
        subprocess.run([
            ffmpeg, "-y", "-loop", "1", "-framerate", str(FPS), "-i", str(slide), "-i", str(audio),
            "-vf", f"scale={WIDTH}:{HEIGHT},format=yuv420p,fade=t=in:st=0:d=0.35",
            "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", str(segment),
        ], check=True)
        segments.append(segment)

    concat_file = WORK / "segments.txt"
    concat_file.write_text("\n".join(f"file '{segment.as_posix()}'" for segment in segments), encoding="utf-8")
    subprocess.run([ffmpeg, "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", "-movflags", "+faststart", str(OUTPUT)], check=True)

    cues = ["WEBVTT", ""]
    cursor = 0.0
    for index, (scene, scene_duration) in enumerate(zip(SCENES, durations), start=1):
        cues.extend([str(index), f"{timestamp(cursor)} --> {timestamp(cursor + scene_duration)}", scene["narration"], ""])
        cursor += scene_duration
    VTT_OUTPUT.write_text("\n".join(cues), encoding="utf-8")
    THUMBNAIL.write_bytes((WORK / "scene-01.png").read_bytes())

    result = {
        "koCode": CODE,
        "status": "qa_pending",
        "voice": VOICE,
        "durationSeconds": round(sum(durations), 2),
        "playbackUrl": f"/media/videos/{CODE}.mp4",
        "videoPath": str(OUTPUT),
        "vttPath": str(VTT_OUTPUT),
        "thumbnailPath": str(THUMBNAIL),
        "scenes": len(SCENES),
    }
    (WORK / "render-result.json").write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    asyncio.run(main())
