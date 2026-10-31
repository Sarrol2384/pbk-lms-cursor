'use client'

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { canonicalCountry, countries, filterCountries } from '@/content/countries'

const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
const labelClass = 'block text-sm font-medium text-gray-800 mb-1'

export function CountrySelect({
  value,
  onChange,
  error,
}: {
  value: string
  onChange: (country: string) => void
  error?: string
}) {
  const listId = useId()
  const listRef = useRef<HTMLUListElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const options = useMemo(() => filterCountries(query), [query])
  const activeIndex = options.length === 0 ? 0 : Math.min(active, options.length - 1)

  useEffect(() => {
    if (!open) return
    const list = listRef.current
    const item = list?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)
    if (!list || !item) return
    const top = item.offsetTop
    const bottom = top + item.offsetHeight
    if (top < list.scrollTop) list.scrollTop = top
    else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight
  }, [open, activeIndex, options])

  function commit(name: string) {
    if (hiddenRef.current) hiddenRef.current.value = name
    onChange(name)
    setQuery('')
    setOpen(false)
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setOpen(true)
      setActive(options.length === 0 ? 0 : Math.min(activeIndex + 1, options.length - 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      setActive(Math.max(activeIndex - 1, 0))
      return
    }
    if (event.key === 'Enter' && open) {
      event.preventDefault()
      const option = options[activeIndex]
      if (option) commit(option.name)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setQuery('')
    }
  }

  return (
    <div className="relative">
      <label htmlFor="country-search" className={labelClass}>Country *</label>
      <input
        id="country-search"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && options[activeIndex] ? `${listId}-${activeIndex}` : undefined}
        aria-invalid={error ? true : undefined}
        aria-required="true"
        aria-describedby={error ? 'country-error' : undefined}
        autoComplete="country-name"
        placeholder="Search countries"
        className={inputClass}
        value={open ? query : value}
        onChange={event => {
          setQuery(event.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => {
          setOpen(true)
          setQuery('')
          const index = countries.findIndex(country => country.name === value)
          setActive(index >= 0 ? index : 0)
        }}
        onBlur={() => {
          const match = canonicalCountry(query)
          if (match) commit(match)
          else {
            setOpen(false)
            setQuery('')
          }
        }}
        onKeyDown={onKeyDown}
      />
      <input ref={hiddenRef} type="hidden" name="country" value={value} />
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">No matching country</li>
          ) : options.map((country, index) => (
            <li
              key={country.name}
              id={`${listId}-${index}`}
              data-index={index}
              role="option"
              aria-selected={country.name === value}
              className={`px-3 py-2 text-sm cursor-pointer ${index === activeIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-800'}`}
              onMouseDown={event => {
                event.preventDefault()
                commit(country.name)
              }}
              onMouseEnter={() => setActive(index)}
            >
              {country.name}
            </li>
          ))}
        </ul>
      )}
      {error && <p id="country-error" className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  )
}
