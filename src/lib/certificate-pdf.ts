import jsPDF from 'jspdf'

const DARK_BLUE = { r: 13,  g: 35,  b: 94  }
const GOLD      = { r: 178, g: 138, b: 46  }
const GOLD_LINE = { r: 198, g: 162, b: 52  }
const BODY      = { r: 45,  g: 45,  b: 45  }
const SIG_TITLE = { r: 85,  g: 85,  b: 85  }

export type CertificateSettings = {
  institution_name : string
  logo_url         : string | null
  seal_url         : string | null
  signature1_url   : string | null
  signature1_name  : string | null
  signature1_title : string | null
  signature2_url   : string | null
  signature2_name  : string | null
  signature2_title : string | null
}

export type CertificateData = {
  fullName          : string
  courseTitle       : string
  courseCode        : string
  nqf               : string | number
  credits           : string | number
  certificateNumber : string
  issuedDate        : string
}

async function imgToBase64(url: string): Promise<{ data: string; fmt: 'PNG' | 'JPEG' }> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('fetch failed: ' + url)
  const buf = Buffer.from(await res.arrayBuffer())
  const ct  = res.headers.get('content-type') ?? ''
  return { data: buf.toString('base64'), fmt: ct.includes('png') ? 'PNG' : 'JPEG' }
}

function pen(doc: jsPDF, c: { r:number; g:number; b:number }) { doc.setDrawColor(c.r, c.g, c.b) }
function ink(doc: jsPDF, c: { r:number; g:number; b:number }) { doc.setTextColor(c.r, c.g, c.b) }

async function tryImage(doc: jsPDF, url: string, x: number, y: number, iw: number, ih: number) {
  try {
    const { data, fmt } = await imgToBase64(url)
    doc.addImage(data, fmt, x, y, iw, ih, undefined, 'NONE')
    return true
  } catch { return false }
}

function drawBorder(doc: jsPDF, W: number, H: number) {
  pen(doc, GOLD_LINE)
  doc.setLineWidth(3)
  doc.rect(6, 5, W - 12, H - 10)
  doc.setLineWidth(0.6)
  doc.rect(11, 9, W - 22, H - 18)
}

export async function buildCertificatePdf(
  data     : CertificateData,
  settings : CertificateSettings | null
): Promise<Buffer> {
  // Landscape A4 – 297 × 210 mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()   // 297
  const H = doc.internal.pageSize.getHeight()  // 210

  drawBorder(doc, W, H)

  const institutionName = settings?.institution_name ?? 'PBK Management and Leadership Institute'

  // ── Institution name ──────────────────────────────────────────────
  // Dynamically scale font so the name fits within 260mm (leaving 18mm margin each side)
  const maxNameWidth = W - 36
  doc.setFont('helvetica', 'bold')
  let nameFontSize = 30
  doc.setFontSize(nameFontSize)
  while (doc.getTextWidth(institutionName) > maxNameWidth && nameFontSize > 16) {
    nameFontSize -= 0.5
    doc.setFontSize(nameFontSize)
  }
  ink(doc, DARK_BLUE)
  doc.text(institutionName, W / 2, 26, { align: 'center' })

  let y = 32

  // ── Logo ──────────────────────────────────────────────────────────
  // PBK logo is 1:1 (square)
  const LOGO_W = 42
  const LOGO_H = 42
  if (settings?.logo_url) {
    await tryImage(doc, settings.logo_url, (W - LOGO_W) / 2, y, LOGO_W, LOGO_H)
    y += LOGO_H + 7
  } else {
    y += 10
  }

  // ── "This is to certify that" ─────────────────────────────────────
  doc.setFont('times', 'italic')
  doc.setFontSize(16)
  ink(doc, BODY)
  doc.text('This is to certify that', W / 2, y, { align: 'center' })
  y += 13

  // ── Student name ──────────────────────────────────────────────────
  doc.setFont('times', 'italic')
  doc.setFontSize(40)
  ink(doc, GOLD)
  doc.text(data.fullName, W / 2, y, { align: 'center' })
  y += 14

  // ── Body sentence ─────────────────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(15)
  ink(doc, BODY)
  doc.text('having fulfilled all the requirements has been awarded the degree of', W / 2, y, { align: 'center' })
  y += 12

  // ── Course / degree name ──────────────────────────────────────────
  doc.setFont('times', 'bold')
  doc.setFontSize(32)
  ink(doc, GOLD)
  doc.text(data.courseTitle, W / 2, y, { align: 'center' })
  y += 11

  // ── Course sub-details ────────────────────────────────────────────
  const subParts = [
    data.courseCode,
    data.nqf     ? `NQF ${data.nqf}`          : '',
    data.credits ? `${data.credits} credits`  : '',
  ].filter(Boolean).join('  •  ')

  if (subParts) {
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    ink(doc, BODY)
    doc.text(subParts, W / 2, y, { align: 'center' })
    y += 8
  }

  // ── Certificate number & date ─────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(12)
  ink(doc, BODY)
  doc.text(
    `Certificate No: ${data.certificateNumber}   |   Date of issue: ${data.issuedDate}`,
    W / 2, y, { align: 'center' }
  )

  // ═══════════════════════════════════════════════════════════════════
  // ── Signature area ────────────────────────────────────────────────
  // Left sig flush-left, right sig flush-right, seal centred between.
  // ═══════════════════════════════════════════════════════════════════
  const MARGIN     = 30      // from page edge to start/end of sig block
  const SIG_W      = 52      // width of each signature block
  const SIG_IMG_H  = 22      // height of signature image
  const SEAL_SIZE  = 36      // seal diameter

  // Fixed vertical band for the signature row
  const SIG_IMG_TOP = H - 58   // top of sig images
  const LINE_Y      = SIG_IMG_TOP + SIG_IMG_H + 2
  const NAME_Y      = LINE_Y + 8
  const TITLE_Y     = NAME_Y + 6

  const leftX  = MARGIN
  const rightX = W - MARGIN - SIG_W

  async function placeSig(
    imgUrl : string | null,
    name   : string | null,
    title  : string | null,
    bx     : number
  ) {
    if (imgUrl) {
      await tryImage(doc, imgUrl, bx, SIG_IMG_TOP, SIG_W, SIG_IMG_H)
    }
    pen(doc, BODY)
    doc.setLineWidth(0.3)
    doc.line(bx, LINE_Y, bx + SIG_W, LINE_Y)
    const cx = bx + SIG_W / 2
    if (name) {
      doc.setFont('times', 'bold')
      doc.setFontSize(11)
      ink(doc, GOLD)
      doc.text(name, cx, NAME_Y, { align: 'center' })
    }
    if (title) {
      doc.setFont('times', 'normal')
      doc.setFontSize(9.5)
      ink(doc, SIG_TITLE)
      const lines = doc.splitTextToSize(title, SIG_W + 10) as string[]
      lines.forEach((ln, i) => doc.text(ln, cx, TITLE_Y + i * 4.8, { align: 'center' }))
    }
  }

  await placeSig(
    settings?.signature1_url   ?? null,
    settings?.signature1_name  ?? null,
    settings?.signature1_title ?? null,
    leftX
  )
  await placeSig(
    settings?.signature2_url   ?? null,
    settings?.signature2_name  ?? null,
    settings?.signature2_title ?? null,
    rightX
  )

  // ── Seal – centred between the two sig blocks ─────────────────────
  if (settings?.seal_url) {
    const sealX = (W - SEAL_SIZE) / 2
    const sealY = SIG_IMG_TOP + (SIG_IMG_H - SEAL_SIZE) / 2
    await tryImage(doc, settings.seal_url, sealX, sealY, SEAL_SIZE, SEAL_SIZE)
  }

  // ── Footer ────────────────────────────────────────────────────────
  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  ink(doc, SIG_TITLE)
  doc.text(institutionName, W / 2, H - 12, { align: 'center' })

  return Buffer.from(doc.output('arraybuffer'))
}
