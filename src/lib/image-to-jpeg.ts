const JPEG_QUALITY = 0.9

/** Draws an image onto a white square (longest side `size`) and returns it as a JPEG file. */
export async function imageToJpeg(file: File, size: number): Promise<File> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, size / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("This browser cannot prepare the image.")
  context.fillStyle = "#FFFFFF"
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY))
  if (!blob) throw new Error("The image could not be prepared.")
  return new File([blob], "logo.jpg", { type: "image/jpeg" })
}
