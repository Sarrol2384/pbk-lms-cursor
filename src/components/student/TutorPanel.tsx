'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MAX_ASSISTANT_CHARS, MAX_HISTORY_MESSAGES, MAX_USER_CHARS } from '@/lib/tutor'

const CONSENT_KEY = 'pbk-tutor-consent-v1'
const FOCUSABLE = 'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'

type ChatTurn = { role: 'user' | 'assistant'; content: string }
type ConsentState = boolean | null

type StoredConsent = { v?: number }

function readStoredConsent(): boolean {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as StoredConsent
    return parsed.v === 1
  } catch {
    return false
  }
}

function storeConsent(): void {
  const value = JSON.stringify({ v: 1, acceptedAt: new Date().toISOString() })
  localStorage.setItem(CONSENT_KEY, value)
}

export default function TutorPanel({
  courseId,
  moduleId,
  unitId,
  available,
}: {
  courseId: string
  moduleId: string
  unitId: string
  available: boolean
}) {
  const titleId = useId()
  const panelId = useId()
  const inputId = useId()
  const openerRef = useRef<HTMLButtonElement>(null)
  const portalRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const consentButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const messagesRef = useRef<ChatTurn[]>([])
  const abortRef = useRef<AbortController | null>(null)
  const requestId = useRef(0)
  const streamingRef = useRef(false)

  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [consent, setConsent] = useState<ConsentState>(null)
  const [messages, setMessages] = useState<ChatTurn[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [streaming, setStreaming] = useState(false)

  useEffect(() => {
    setMounted(true)
    setConsent(readStoredConsent())
  }, [])

  const close = useCallback(() => {
    requestId.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    streamingRef.current = false
    setStreaming(false)
    setMessages((current) => {
      const updated = current.slice()
      const last = updated[updated.length - 1]
      if (last?.role === 'assistant' && !last.content.trim()) updated.pop()
      messagesRef.current = updated
      return updated
    })
    setOpen(false)
    window.setTimeout(() => openerRef.current?.focus(), 0)
  }, [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const hidden: HTMLElement[] = []
    const portal = portalRef.current
    document.body.childNodes.forEach((node) => {
      if (!(node instanceof HTMLElement) || node === portal || node.hasAttribute('inert')) return
      node.setAttribute('inert', '')
      hidden.push(node)
    })
    return () => {
      document.body.style.overflow = previousOverflow
      hidden.forEach((node) => node.removeAttribute('inert'))
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    if (!panel) return
    const sheet: HTMLDivElement = panel
    const desktop = window.matchMedia('(min-width: 1024px)')
    const viewport = window.visualViewport
    function apply() {
      if (desktop.matches || !viewport) {
        sheet.style.top = ''
        sheet.style.left = ''
        sheet.style.right = ''
        sheet.style.bottom = ''
        sheet.style.height = ''
        return
      }
      sheet.style.left = '0px'
      sheet.style.right = '0px'
      sheet.style.bottom = 'auto'
      sheet.style.top = `${viewport.offsetTop}px`
      sheet.style.height = `${Math.max(0, viewport.height)}px`
    }
    apply()
    desktop.addEventListener('change', apply)
    viewport?.addEventListener('resize', apply)
    viewport?.addEventListener('scroll', apply)
    return () => {
      desktop.removeEventListener('change', apply)
      viewport?.removeEventListener('resize', apply)
      viewport?.removeEventListener('scroll', apply)
      sheet.style.top = ''
      sheet.style.left = ''
      sheet.style.right = ''
      sheet.style.bottom = ''
      sheet.style.height = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      if (!available) closeButtonRef.current?.focus()
      else if (consent === false) consentButtonRef.current?.focus()
      else if (consent === true) inputRef.current?.focus()
      else closeButtonRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, available, consent])

  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close()
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scroller) return
    scroller.scrollTop = scroller.scrollHeight
  }, [messages, open, consent, error, streaming])

  function acceptConsent() {
    try {
      storeConsent()
    } catch {
      // Private browsing can block storage. This visit can still continue.
    }
    setConsent(true)
  }

  async function send(text: string) {
    const trimmed = text.trim()
    if (!available || !trimmed || streamingRef.current) return
    if (trimmed.length > MAX_USER_CHARS) {
      setError(`Please keep each message under ${MAX_USER_CHARS} characters.`)
      return
    }

    const id = ++requestId.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    streamingRef.current = true
    setStreaming(true)
    setError(null)
    setDraft('')

    const history = [...messagesRef.current, { role: 'user' as const, content: trimmed }].slice(-MAX_HISTORY_MESSAGES)
    const next = [...history, { role: 'assistant' as const, content: '' }]
    messagesRef.current = next
    setMessages(next)

    const stillCurrent = () => requestId.current === id

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          moduleId,
          unitId,
          messages: history.map((turn) => ({
            role: turn.role,
            content: turn.content.slice(0, turn.role === 'user' ? MAX_USER_CHARS : MAX_ASSISTANT_CHARS),
          })),
        }),
        signal: controller.signal,
      })

      if (!stillCurrent()) return

      const contentType = response.headers.get('content-type') ?? ''
      if (response.redirected || contentType.includes('text/html')) {
        throw new Error('Please sign in again.')
      }
      if (!response.ok || !response.body) {
        let message = 'The tutor could not reply. Please try again.'
        if (contentType.includes('application/json')) {
          try {
            const data = await response.json() as { error?: unknown }
            if (typeof data.error === 'string' && data.error.trim()) message = data.error
          } catch {
            // Keep the plain fallback.
          }
        }
        throw new Error(message)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let full = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        full += decoder.decode(value, { stream: true })
        if (!stillCurrent()) return
        const snapshot = full
        setMessages((current) => {
          const updated = current.slice()
          const last = updated[updated.length - 1]
          if (last?.role === 'assistant') updated[updated.length - 1] = { role: 'assistant', content: snapshot }
          messagesRef.current = updated
          return updated
        })
      }
      full += decoder.decode()
      if (!stillCurrent()) return
      if (!full.trim()) {
        throw new Error('The tutor could not reply. Please try again.')
      }
    } catch (err) {
      if (!stillCurrent()) return
      const aborted = err instanceof DOMException && err.name === 'AbortError'
      if (!aborted) {
        const message = err instanceof Error && err.message
          ? err.message
          : 'The tutor could not reply. Please try again.'
        setError(message)
        setDraft((current) => (current.trim() ? current : trimmed))
      }
      setMessages((current) => {
        const updated = current.slice()
        const last = updated[updated.length - 1]
        const assistantEmpty = last?.role === 'assistant' && !last.content.trim()
        if (assistantEmpty) updated.pop()
        if (!aborted) {
          const userTurn = updated[updated.length - 1]
          if (userTurn?.role === 'user' && userTurn.content === trimmed) updated.pop()
        }
        messagesRef.current = updated
        return updated
      })
    } finally {
      if (stillCurrent()) {
        streamingRef.current = false
        setStreaming(false)
        abortRef.current = null
      }
    }
  }

  function stop() {
    abortRef.current?.abort()
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(draft)
  }

  const sheet = (
    <div ref={portalRef} className="fixed inset-0 z-[70]">
      <button
        type="button"
        aria-label="Close tutor"
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />
      <div
        ref={panelRef}
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={streaming}
        tabIndex={-1}
        className="absolute inset-x-0 bottom-0 flex h-[100dvh] max-h-[100dvh] w-full min-w-0 flex-col bg-white text-gray-900 shadow-2xl animate-tutor-sheet motion-reduce:animate-none lg:animate-tutor-side lg:motion-reduce:animate-none lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-full lg:w-[400px] lg:border-l lg:border-gray-200"
      >
        <header className="shrink-0 border-b border-gray-200 pb-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="mx-auto mb-2 h-1.5 w-10 rounded-full bg-gray-300 lg:hidden" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 id={titleId} className="text-base font-semibold text-gray-900">Ask the AI tutor</h2>
              <p className="mt-0.5 text-xs leading-5 text-gray-500">Explains this unit. Will not write your assignment.</p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={close}
              aria-label="Close tutor"
              className="inline-flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        <div
          ref={scrollerRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]"
        >
          {available ? (
            consent === null ? (
              <p className="text-base text-gray-500">Loading…</p>
            ) : consent ? (
              messages.length === 0 ? (
                <p className="text-base leading-relaxed text-gray-600">
                  Ask anything about this unit. I explain it in plain English. You can ask me to reply in isiXhosa, isiZulu, or Afrikaans.
                </p>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={cn(
                        'max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-base leading-relaxed',
                        message.role === 'user' ? 'ml-auto bg-blue-600 text-white' : 'mr-auto bg-gray-100 text-gray-900'
                      )}
                    >
                      {message.role === 'assistant' && message.content === '' ? (
                        <span className="text-gray-500">Writing…</span>
                      ) : (
                        message.content
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="space-y-3 text-base leading-relaxed text-gray-800">
                <p className="font-medium text-gray-900">Before you use the tutor</p>
                <p>This tutor is an AI service from Anthropic. When you send a message, we send Anthropic:</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>your message and this chat</li>
                  <li>the title and text of this unit</li>
                  <li>the module title</li>
                  <li>the assignment rubric, if you ask for feedback on a draft or paste a longer piece of your own writing</li>
                </ul>
                <p>We do not store this chat on our servers. It stays in this browser until you leave the page.</p>
                <p>Do not paste your ID number, phone number, address, or other personal information.</p>
              </div>
            )
          ) : (
            <p className="text-base leading-relaxed text-gray-800">The tutor isn&apos;t available right now</p>
          )}
          {error ? (
            <p role="alert" className="mt-3 text-sm leading-relaxed text-red-700">{error}</p>
          ) : null}
        </div>

        {available && consent === false ? (
          <div className="shrink-0 border-t border-gray-200 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <button
              ref={consentButtonRef}
              type="button"
              onClick={acceptConsent}
              className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              I understand
            </button>
          </div>
        ) : null}

        {available && consent === true ? (
          <form
            onSubmit={onSubmit}
            className="shrink-0 border-t border-gray-200 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          >
            <label htmlFor={inputId} className="sr-only">Your question</label>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                id={inputId}
                value={draft}
                rows={2}
                maxLength={MAX_USER_CHARS}
                enterKeyHint="enter"
                placeholder="Ask about this unit"
                disabled={streaming}
                onChange={(event) => setDraft(event.target.value)}
                className="max-h-32 min-h-11 w-full min-w-0 flex-1 resize-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base leading-6 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
              {streaming ? (
                <button
                  type="button"
                  onClick={stop}
                  className="inline-flex h-11 min-w-[4.5rem] shrink-0 touch-manipulation items-center justify-center rounded-lg border border-gray-300 bg-white px-3 text-base font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  Stop
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  className="inline-flex h-11 min-w-[4.5rem] shrink-0 touch-manipulation items-center justify-center rounded-lg bg-blue-600 px-3 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  Send
                </button>
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              <span className={draft.length > MAX_USER_CHARS - 200 ? 'text-amber-700' : undefined}>
                {draft.length}/{MAX_USER_CHARS}
              </span>
              {' '}
              Don&apos;t include ID numbers or personal details. The tutor gives guidance only.
            </p>
          </form>
        ) : null}
      </div>
    </div>
  )

  return (
    <>
      <button
        ref={openerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 w-full touch-manipulation items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 sm:w-auto"
      >
        Ask the AI tutor
      </button>
      {mounted && open ? createPortal(sheet, document.body) : null}
    </>
  )
}
