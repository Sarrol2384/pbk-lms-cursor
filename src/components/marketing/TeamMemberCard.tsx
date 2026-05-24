'use client'

import { useState } from 'react'
import type { TeamMember } from '@/content/marketing'

function initialsFromName(name: string) {
  const parts = name.replace(/^(Prof\.|Professor|Dr|Mrs\.|Bishop)\s+/gi, '').split(/\s+/).filter(Boolean)
  return parts
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()
}

export function TeamMemberCard({ member }: { member: TeamMember }) {
  const [imgError, setImgError] = useState(false)
  const showPhoto = member.photoUrl && !imgError

  return (
    <article className="flex flex-col h-full bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden hover:shadow-md hover:border-blue-300 transition-all">
      <div className="h-1.5 bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 shrink-0" aria-hidden />
      <div className="p-4 flex flex-col flex-1">
        <div className="aspect-square w-full bg-blue-50 border-2 border-blue-100 overflow-hidden mb-4 ring-1 ring-blue-50">
          {showPhoto ? (
            <img
              src={member.photoUrl!}
              alt={member.name}
              className="w-full h-full object-cover object-top"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-50 text-blue-800 text-3xl font-bold">
              {initialsFromName(member.name)}
            </div>
          )}
        </div>
        <h2 className="font-serif text-base font-bold text-blue-950 leading-snug">{member.name}</h2>
        <p className="text-sm text-blue-700 font-medium mt-1 mb-3">{member.role}</p>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed flex-1">{member.bio}</p>
        {member.philosophy && (
          <p className="text-xs sm:text-sm text-gray-600 mt-3 pt-3 border-t border-blue-100 italic leading-relaxed bg-blue-50/60 -mx-4 px-4 pb-1 -mb-1">
            <span className="font-semibold not-italic text-blue-800">Personal philosophy: </span>
            &ldquo;{member.philosophy}&rdquo;
          </p>
        )}
      </div>
    </article>
  )
}
