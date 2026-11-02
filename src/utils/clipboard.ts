/** 비동기 Clipboard API는 HTML을 정리하며 Excel 서식을 지우므로 copy 이벤트로 원본을 그대로 쓴다. */
function copyWithEvent(text: string, html: string): boolean {
  let written = false
  const handleCopy = (event: ClipboardEvent) => {
    if (!event.clipboardData) return
    event.clipboardData.setData('text/plain', text)
    event.clipboardData.setData('text/html', html)
    event.preventDefault()
    written = true
  }

  document.addEventListener('copy', handleCopy)
  try {
    return document.execCommand('copy') && written
  } finally {
    document.removeEventListener('copy', handleCopy)
  }
}

export async function copyTable(text: string, html: string): Promise<void> {
  if (copyWithEvent(text, html)) return

  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/plain': new Blob([text], { type: 'text/plain' }),
        'text/html': new Blob([html], { type: 'text/html' }),
      }),
    ])
  } catch (err) {
    console.error('서식 포함 복사 실패, 텍스트로 다시 복사합니다:', err)
    await navigator.clipboard.writeText(text)
  }
}
