import type { useMobiReader } from '@/lib/reader/hooks/useMobiReader'
import ReaderTopBar from './ReaderTopBar'

type ReaderToolbarProps = {
  reader: ReturnType<typeof useMobiReader>
  onTtsSettings: () => void
}

export function ReaderToolbar({ reader, onTtsSettings }: ReaderToolbarProps) {
  const {
    bookQ,
    showAppearance,
    setShowAppearance,
    appearance,
    columns,
    toggleColumns,
    pagination,
    jumpPage,
    setJumpPage,
    tts,
  } = reader

  return (
    <ReaderTopBar
      title={bookQ.data?.title}
      showAppearance={showAppearance}
      onShowAppearanceChange={setShowAppearance}
      fontFamily={appearance.fontFamily}
      lineHeight={appearance.lineHeight}
      margin={appearance.margin}
      onFontFamilyChange={appearance.setFontFamily}
      onLineHeightChange={appearance.setLineHeight}
      onMarginChange={appearance.setMargin}
      columns={columns}
      onToggleColumns={toggleColumns}
      onPrev={pagination.prev}
      onNext={pagination.next}
      currentPage={pagination.currentPage}
      totalPages={pagination.totalPages}
      jumpPage={jumpPage}
      onJumpPageChange={setJumpPage}
      onJumpPageGo={() => {
        // Extract the first number from the input (handles "42", "42-43", etc.)
        const match = jumpPage.match(/\d+/)
        const value = match ? Number(match[0]) : NaN

        if (Number.isFinite(value) && value >= 1) {
          pagination.scrollToPage(Math.min(value, pagination.totalPages))
          setJumpPage('') // Clear after jumping to show the current page(s) in the placeholder
        }
      }}
      onBack={() => window.history.back()}
      ttsState={tts.state}
      onTtsPlay={() => {
        if (tts.state === 'paused') {
          tts.resume()
        } else {
          tts.playCurrentPage()
        }
      }}
      onTtsPause={tts.pause}
      onTtsStop={tts.stop}
      onTtsSettings={onTtsSettings}
    />
  )
}
