$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open("C:\Users\bugrz\Downloads\LocalAkademi_Birlesik_Ana_Dokuman.docx")
$doc.Content.Text | Out-File -FilePath "C:\Users\bugrz\LocalAkademi_extracted\doc_content.txt" -Encoding UTF8
$doc.Close()
$word.Quit()
Write-Host "Document extracted to doc_content.txt"