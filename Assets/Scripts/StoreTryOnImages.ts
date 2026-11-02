/** Lens-only image encoding. Saved list items contain pixels, never provider URLs. */
export function encodeImage(texture: Texture, quality = CompressionQuality.HighQuality): Promise<string> {
  return new Promise((resolve, reject) => {
    Base64.encodeTextureAsync(texture, resolve, () => reject(new Error('Could not encode photo. Retake and try again.')), quality, EncodingType.Jpg)
  })
}

export function decodeImage(base64: string): Promise<Texture> {
  return new Promise((resolve, reject) => {
    Base64.decodeTextureAsync(base64, resolve, () => reject(new Error('Saved image could not be decoded.')))
  })
}

/** Preserve aspect ratio; thumbnails keep device storage bounded without storing expiring links. */
export function makeThumbnail(texture: Texture, longEdge = 192): Texture {
  const source = ProceduralTextureProvider.createFromTexture(texture)
  const sw = source.getWidth(), sh = source.getHeight()
  const ratio = Math.min(1, longEdge / Math.max(sw, sh))
  const tw = Math.max(1, Math.round(sw * ratio)), th = Math.max(1, Math.round(sh * ratio))
  if (ratio === 1) return source
  const pixels = new Uint8Array(sw * sh * 4)
  ;(source.control as ProceduralTextureProvider).getPixels(0, 0, sw, sh, pixels)
  const resized = new Uint8Array(tw * th * 4)
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const src = (Math.min(sh - 1, Math.floor(y / ratio)) * sw + Math.min(sw - 1, Math.floor(x / ratio))) * 4
    const dst = (y * tw + x) * 4
    resized[dst] = pixels[src]; resized[dst + 1] = pixels[src + 1]
    resized[dst + 2] = pixels[src + 2]; resized[dst + 3] = 255
  }
  const result = ProceduralTextureProvider.createWithFormat(tw, th, TextureFormat.RGBA8Unorm)
  ;(result.control as ProceduralTextureProvider).setPixels(0, 0, tw, th, resized)
  return result
}
