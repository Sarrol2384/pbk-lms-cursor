'use client'

import { useRef } from 'react'

export function EventPoster({
  src,
  alt,
  width,
  height,
}: {
  src: string
  alt: string
  width: number
  height: number
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <figure>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="group block w-full overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm cursor-zoom-in focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <img src={src} alt={alt} width={width} height={height} className="h-auto w-full" />
        <span className="block px-4 py-3 text-sm font-semibold text-blue-700 group-hover:underline">
          View full size
        </span>
      </button>
      <dialog
        ref={dialogRef}
        aria-label={alt}
        className="max-h-[95vh] max-w-[min(100vw-2rem,42rem)] overflow-auto border-0 bg-transparent p-0 backdrop:bg-black/80"
        onClick={event => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <img src={src} alt="" className="mx-auto h-auto max-h-[80vh] w-auto max-w-full rounded-md bg-white" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-white underline"
          >
            Open image file
          </a>
          <form method="dialog">
            <button
              type="submit"
              autoFocus
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-gray-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Close
            </button>
          </form>
        </div>
      </dialog>
    </figure>
  )
}
