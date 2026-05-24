'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-gray-50 px-4 font-sans">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">{error.message}</p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-2.5 rounded-lg text-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
