import { type DocumentProps, pdf } from "@react-pdf/renderer"
import { createElement, type ReactElement } from "react"

import crest from "@/assets/cls-crest.png"

import type { PrintableDocument } from "./document-model"
import { ExamDocumentPdf } from "./document-pdf"

let logoCache: Promise<string> | null = null

/** The crest is large; shrink it once to a small PNG data URL for the PDF. */
function pdfLogo() {
  logoCache ??= new Promise<string>((resolve) => {
    const image = new window.Image()
    image.onload = () => {
      const size = 160
      const canvas = document.createElement("canvas")
      canvas.width = size
      canvas.height = Math.round((image.height / image.width) * size)
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL("image/png"))
    }
    image.onerror = () => resolve(crest)
    image.src = crest
  })
  return logoCache
}

export async function downloadDocumentPdf(doc: PrintableDocument) {
  const logo = await pdfLogo()
  // ExamDocumentPdf renders a <Document>, which is what pdf() expects.
  const element = createElement(ExamDocumentPdf, { doc, logo }) as ReactElement<DocumentProps>
  const blob = await pdf(element).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = doc.filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
