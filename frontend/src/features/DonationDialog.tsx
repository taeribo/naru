import { useRef } from 'react'

export function DonationDialog() {
  const dialog = useRef<HTMLDialogElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)

  function close() {
    dialog.current?.close()
    trigger.current?.focus()
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className="donation-trigger"
        aria-label="후원 팝업 열기"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <span aria-hidden="true" className="donation-petal" />
      </button>
      <dialog
        ref={dialog}
        className="plaza-panel donation-panel"
        aria-label="후원"
        onCancel={(event) => {
          event.preventDefault()
          close()
        }}
      >
        <div className="donation-qr" aria-hidden="true" />
        <button type="button" className="plaza-button" onClick={close}>
          닫기
        </button>
      </dialog>
    </>
  )
}
