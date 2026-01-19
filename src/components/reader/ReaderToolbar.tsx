import ReaderTopBar from "./ReaderTopBar";
import { useMobiReader } from "@/lib/reader/hooks/useMobiReader";

type ReaderToolbarProps = {
  reader: ReturnType<typeof useMobiReader>;
};

export function ReaderToolbar({ reader }: ReaderToolbarProps) {
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
  } = reader;

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
        const value = Number(jumpPage);
        if (Number.isFinite(value) && value >= 1) {
          pagination.scrollToPage(Math.min(value, pagination.totalPages));
        }
      }}
      onBack={() => window.history.back()}
      ttsState={tts.state}
      onTtsPlay={() => {
        if (tts.state === 'paused') {
          tts.resume();
        } else {
          tts.playCurrentPage();
        }
      }}
      onTtsPause={tts.pause}
      onTtsStop={tts.stop}
    />
  );
}
