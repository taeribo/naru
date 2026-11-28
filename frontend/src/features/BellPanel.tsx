/** 종 울리기 창: 누르면 창이 닫히고 캐릭터가 종각으로 가서 당목을 당겨 종을 친다. */
export function BellPanel({
  onRing,
  disabled,
}: {
  onRing: () => void
  disabled: boolean
}) {
  return (
    <div className="zone-panel">
      <button
        type="button"
        className="plaza-button"
        disabled={disabled}
        onClick={onRing}
      >
        종 울리기
      </button>
      <p>종각으로 가서 당목 줄을 당겨 종을 쳐요.</p>
    </div>
  )
}
