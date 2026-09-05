import { useState, type CSSProperties } from 'react'

interface WordIconProps {
  wordId: string
  size?: number
}

function IconShape({ wordId }: { wordId: string }) {
  switch (wordId) {
    case 'dog':
      return (
        <g>
          <circle cx="50" cy="55" r="30" fill="#e3b27a" />
          <path d="M28 35 L18 15 L38 30 Z" fill="#e3b27a" />
          <path d="M72 35 L82 15 L62 30 Z" fill="#e3b27a" />
          <circle cx="40" cy="52" r="4" fill="#4a3b4a" />
          <circle cx="60" cy="52" r="4" fill="#4a3b4a" />
          <ellipse cx="50" cy="64" rx="6" ry="4" fill="#4a3b4a" />
        </g>
      )
    case 'cat':
      return (
        <g>
          <circle cx="50" cy="55" r="28" fill="#c9c9c9" />
          <path d="M26 34 L20 12 L40 28 Z" fill="#c9c9c9" />
          <path d="M74 34 L80 12 L60 28 Z" fill="#c9c9c9" />
          <circle cx="40" cy="54" r="4" fill="#4a3b4a" />
          <circle cx="60" cy="54" r="4" fill="#4a3b4a" />
          <path d="M50 60 L46 66 L54 66 Z" fill="#f4a0a0" />
        </g>
      )
    case 'bird':
      return (
        <g>
          <ellipse cx="50" cy="55" rx="26" ry="24" fill="#8fc7ff" />
          <circle cx="60" cy="45" r="14" fill="#8fc7ff" />
          <circle cx="65" cy="42" r="3" fill="#4a3b4a" />
          <path d="M76 44 L86 48 L76 52 Z" fill="#ffd166" />
          <path d="M28 60 Q40 75 30 80 Q45 78 50 62 Z" fill="#5fa8e6" />
        </g>
      )
    case 'fish':
      return (
        <g>
          <ellipse cx="46" cy="55" rx="28" ry="18" fill="#7ec8e3" />
          <path d="M74 55 L92 42 L92 68 Z" fill="#5fa8c9" />
          <circle cx="34" cy="50" r="3" fill="#4a3b4a" />
          <path d="M20 55 Q30 48 30 62 Q30 55 20 55" fill="#5fa8c9" />
        </g>
      )
    case 'rabbit':
      return (
        <g>
          <circle cx="50" cy="60" r="24" fill="#f5f0ea" />
          <ellipse cx="38" cy="20" rx="8" ry="22" fill="#f5f0ea" />
          <ellipse cx="62" cy="20" rx="8" ry="22" fill="#f5f0ea" />
          <ellipse cx="38" cy="22" rx="4" ry="14" fill="#f4a0c0" />
          <ellipse cx="62" cy="22" rx="4" ry="14" fill="#f4a0c0" />
          <circle cx="42" cy="58" r="4" fill="#4a3b4a" />
          <circle cx="58" cy="58" r="4" fill="#4a3b4a" />
          <ellipse cx="50" cy="68" rx="5" ry="3" fill="#f4a0c0" />
        </g>
      )
    case 'bear':
      return (
        <g>
          <circle cx="50" cy="58" r="28" fill="#a9764f" />
          <circle cx="26" cy="28" r="12" fill="#a9764f" />
          <circle cx="74" cy="28" r="12" fill="#a9764f" />
          <circle cx="42" cy="56" r="4" fill="#4a3b4a" />
          <circle cx="58" cy="56" r="4" fill="#4a3b4a" />
          <ellipse cx="50" cy="66" rx="10" ry="7" fill="#d8b48f" />
          <ellipse cx="50" cy="68" rx="3" ry="2" fill="#4a3b4a" />
        </g>
      )
    case 'apple':
      return (
        <g>
          <circle cx="50" cy="58" r="28" fill="#ff6b6b" />
          <path d="M50 30 Q46 18 54 12" stroke="#7a5230" strokeWidth="4" fill="none" />
          <ellipse cx="60" cy="18" rx="8" ry="5" fill="#7ed6a5" />
        </g>
      )
    case 'banana':
      return (
        <g>
          <path
            d="M25 70 Q30 25 70 20 Q75 22 72 28 Q40 34 38 72 Q32 78 25 70 Z"
            fill="#ffd166"
            stroke="#e0a83a"
            strokeWidth="3"
          />
        </g>
      )
    case 'grape':
      return (
        <g fill="#a06bd6">
          <circle cx="40" cy="40" r="12" />
          <circle cx="60" cy="40" r="12" />
          <circle cx="30" cy="58" r="12" />
          <circle cx="50" cy="58" r="12" />
          <circle cx="70" cy="58" r="12" />
          <circle cx="40" cy="76" r="12" />
          <circle cx="60" cy="76" r="12" />
        </g>
      )
    case 'strawberry':
      return (
        <g>
          <path d="M50 30 Q75 40 65 70 Q50 88 35 70 Q25 40 50 30 Z" fill="#ff5f8a" />
          <path d="M38 32 L44 22 L50 30 L56 22 L62 32 Z" fill="#7ed6a5" />
          <circle cx="42" cy="48" r="2" fill="#fff1cf" />
          <circle cx="55" cy="52" r="2" fill="#fff1cf" />
          <circle cx="46" cy="62" r="2" fill="#fff1cf" />
        </g>
      )
    case 'sun':
      return (
        <g>
          <circle cx="50" cy="50" r="20" fill="#ffd166" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <rect
              key={deg}
              x="47"
              y="8"
              width="6"
              height="16"
              rx="3"
              fill="#ffd166"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
        </g>
      )
    case 'star':
      return (
        <path
          d="M50 12 L60 38 L88 38 L65 55 L74 82 L50 65 L26 82 L35 55 L12 38 L40 38 Z"
          fill="#ffd166"
        />
      )
    case 'heart':
      return (
        <path
          d="M50 82 C10 55 20 22 42 24 C48 25 50 32 50 32 C50 32 52 25 58 24 C80 22 90 55 50 82 Z"
          fill="#ff5f8a"
        />
      )
    case 'moon':
      return <path d="M62 15 A35 35 0 1 0 62 85 A28 28 0 1 1 62 15 Z" fill="#ffe08a" />
    case 'flower':
      return (
        <g>
          {[0, 72, 144, 216, 288].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="28"
              rx="10"
              ry="16"
              fill="#ff9bd2"
              transform={`rotate(${deg} 50 50)`}
            />
          ))}
          <circle cx="50" cy="50" r="10" fill="#ffd166" />
        </g>
      )
    case 'balloon':
      return (
        <g>
          <ellipse cx="50" cy="42" rx="22" ry="28" fill="#ff8fc7" />
          <path d="M50 70 L50 90" stroke="#4a3b4a" strokeWidth="2" />
          <path d="M46 70 L50 78 L54 70 Z" fill="#ff8fc7" />
        </g>
      )
    case 'elephant':
      return (
        <g>
          <circle cx="50" cy="55" r="26" fill="#a8b0c0" />
          <ellipse cx="26" cy="45" rx="12" ry="16" fill="#a8b0c0" />
          <ellipse cx="74" cy="45" rx="12" ry="16" fill="#c7ccd8" />
          <path d="M42 68 Q38 90 30 92" stroke="#a8b0c0" strokeWidth="8" fill="none" strokeLinecap="round" />
          <circle cx="42" cy="50" r="4" fill="#4a3b4a" />
          <circle cx="58" cy="50" r="4" fill="#4a3b4a" />
        </g>
      )
    case 'lion':
      return (
        <g>
          <circle cx="50" cy="55" r="22" fill="#f4b860" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
            <ellipse
              key={deg}
              cx="50"
              cy="30"
              rx="10"
              ry="16"
              fill="#e0973f"
              transform={`rotate(${deg} 50 55)`}
            />
          ))}
          <circle cx="42" cy="52" r="3.5" fill="#4a3b4a" />
          <circle cx="58" cy="52" r="3.5" fill="#4a3b4a" />
          <ellipse cx="50" cy="62" rx="6" ry="4" fill="#a9764f" />
        </g>
      )
    case 'orange':
      return (
        <g>
          <circle cx="50" cy="55" r="28" fill="#ffa64f" />
          <path d="M50 30 Q46 20 54 15" stroke="#7ed6a5" strokeWidth="5" fill="none" strokeLinecap="round" />
        </g>
      )
    case 'watermelon':
      return (
        <g>
          <path d="M20 45 A30 30 0 0 0 80 45 Z" fill="#4fa84f" />
          <path d="M25 45 A25 25 0 0 0 75 45 Z" fill="#f5f0ea" />
          <path d="M30 45 A20 20 0 0 0 70 45 Z" fill="#ff5f6d" />
          <circle cx="42" cy="38" r="2" fill="#4a3b4a" />
          <circle cx="50" cy="34" r="2" fill="#4a3b4a" />
          <circle cx="58" cy="38" r="2" fill="#4a3b4a" />
        </g>
      )
    case 'red':
      return <circle cx="50" cy="50" r="32" fill="#ff5f5f" stroke="#e04040" strokeWidth="4" />
    case 'blue':
      return <circle cx="50" cy="50" r="32" fill="#5f9bff" stroke="#3f7fe0" strokeWidth="4" />
    case 'yellow':
      return <circle cx="50" cy="50" r="32" fill="#ffd166" stroke="#e0a83a" strokeWidth="4" />
    case 'green':
      return <circle cx="50" cy="50" r="32" fill="#7ed6a5" stroke="#4fb894" strokeWidth="4" />
    case 'purple':
      return <circle cx="50" cy="50" r="32" fill="#a06bd6" stroke="#7f4fb0" strokeWidth="4" />
    case 'pink':
      return <circle cx="50" cy="50" r="32" fill="#ff8fc7" stroke="#e0688f" strokeWidth="4" />
    case 'brown':
      return <circle cx="50" cy="50" r="32" fill="#a9764f" stroke="#7a5230" strokeWidth="4" />
    case 'black':
      return <circle cx="50" cy="50" r="32" fill="#4a3b4a" stroke="#2a1f2a" strokeWidth="4" />
    default:
      return <circle cx="50" cy="50" r="30" fill="#ffb6d9" />
  }
}

export function WordIcon({ wordId, size = 96 }: WordIconProps) {
  const [generatedImageFailed, setGeneratedImageFailed] = useState(false)

  // `size` sets the mobile-baseline box via a CSS variable rather than a literal
  // width/height attribute — the `.word-icon` rule in components.css scales it up at
  // wider viewports (a PC browser window has far more room than a phone/tablet, and a
  // flat pixel size left images too small to make out on a large screen; see the
  // "画面サイズに合わせてイメージの大きさを調整" request). Each call site's relative
  // sizing (a 140px hero image vs. a 72px choice tile) is preserved since they all
  // scale by the same factor together.
  const style = { '--icon-size': `${size}px` } as CSSProperties

  if (!generatedImageFailed) {
    return (
      <img
        src={`${import.meta.env.BASE_URL}images/words/${wordId}.png`}
        alt={wordId}
        className="word-icon"
        style={style}
        onError={() => setGeneratedImageFailed(true)}
      />
    )
  }

  return (
    <svg className="word-icon" style={style} viewBox="0 0 100 100" role="img" aria-label={wordId}>
      <IconShape wordId={wordId} />
    </svg>
  )
}
