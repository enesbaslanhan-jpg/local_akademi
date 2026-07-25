@echo off
chcp 65001 >nul
set "OLLAMA_EXE=%LOCALAPPDATA%\Programs\Ollama\ollama.exe"

if not exist "%OLLAMA_EXE%" (
  where ollama.exe >nul 2>&1
  if errorlevel 1 (
    echo Ollama kurulu degil. Resmi indirme sayfasi aciliyor...
    start "" "https://ollama.com/download/windows"
    echo.
    echo Ollama'yi kurduktan sonra bu dosyaya tekrar cift tiklayin.
    pause
    exit /b 1
  )
  set "OLLAMA_EXE=ollama.exe"
)

echo Qwen3 4B modeli indiriliyor. Bu islem ilk seferde zaman alabilir...
"%OLLAMA_EXE%" pull qwen3:4b-instruct
if errorlevel 1 (
  echo Model indirilemedi. Internet baglantisini kontrol edip tekrar deneyin.
  pause
  exit /b 1
)

echo.
echo Yerel AI hazir. LocalAkademi'yi yeniden baslatin.
pause
