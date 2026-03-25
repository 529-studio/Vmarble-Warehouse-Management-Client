import { ImageResponse } from 'next/og'

// Next.js will serve this as /icon.png and reference it automatically in <head>.
// Sizes: 32 px for browser tab favicon, 192/512 are handled by apple-icon & manifest.

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          fontWeight: 700,
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 6,
          letterSpacing: '-1px',
        }}
      >
        V
      </div>
    ),
    { ...size },
  )
}
