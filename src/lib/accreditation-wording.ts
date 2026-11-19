/**
 * Learner-facing wording for accreditation.
 *
 * PBK is globally accredited. It is not SAQA accredited, SAQA registered,
 * or registered on the South African NQF. These helpers change what we
 * show. They do not update stored course rows.
 */

const SETA_NQF_SENTENCE =
  /\bSETA[-\s]?aligned programme at NQF Level \d+\b/gi

const SAQA_ALIGNMENT =
  /\baligned with SAQA and the NQF(?: for national and international recognition)?/gi

const STATUS_CLAIM =
  /\b(?:SAQA|NQF|SETA)[-\s]?(?:accredited|registered|registration|aligned|approved)\b/gi

const SAQA_ID =
  /\(\s*SAQA(?:\s*(?:ID|qualification))?\s*[:#-]?\s*\d+\s*\)|\bSAQA(?:\s*(?:ID|qualification))?\s*[:#-]?\s*\d+\b/gi

const NQF_LEVEL = /\bNQF\s*(?:Level\s*)?\d+\b/gi

export function withoutSaqaOrNqfClaim(value: string): string {
  let text = value
  text = text.replace(SETA_NQF_SENTENCE, 'globally accredited programme')
  text = text.replace(SAQA_ALIGNMENT, 'globally accredited')
  text = text.replace(STATUS_CLAIM, 'globally accredited')
  text = text.replace(SAQA_ID, '')
  text = text.replace(NQF_LEVEL, '')
  text = text.replace(/\bglobally accredited\b(?:\s*(?:,|and)\s*\bglobally accredited\b)+/gi, 'globally accredited')
  text = text.replace(/\(\s*\)/g, '')
  text = text.replace(/\s+([,.;:])/g, '$1')
  text = text.replace(/[ \t]{2,}/g, ' ')
  text = text.replace(/\s+([—–-])\s*$/g, '')
  return text.trim()
}

export function publicProgrammeText(value: string | null | undefined): string {
  if (!value) return ''
  return withoutSaqaOrNqfClaim(value)
}

/** Code and credits only. The stored level is not published as an NQF level. */
export function programmeMetaLine(
  code: string | null | undefined,
  credits: number | string | null | undefined,
): string {
  const parts = [
    code?.trim() || '',
    credits !== null && credits !== undefined && credits !== '' ? `${credits} credits` : '',
  ].filter(Boolean)
  return parts.join(' • ')
}

export function storesAccreditationClaim(input: {
  title?: string | null
  description?: string | null
  saqaId?: string | null
}): boolean {
  if (input.saqaId?.trim()) return true
  return /\bSAQA\b|\bNQF\b|\bSETA\b/i.test(`${input.title ?? ''}\n${input.description ?? ''}`)
}
