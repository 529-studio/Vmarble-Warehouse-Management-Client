import { ImageResponse } from 'next/og'

// Apple touch icon — used for "Add to Home Screen" on iOS.
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 100,
          fontWeight: 700,
          background: '#09090b',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: 36,
          letterSpacing: '-4px',
        }}
      >
        V
      </div>
    ),
    { ...size },
  )
}
