interface HiraganaCharProps {
  char: string
  size?: number
}

export function HiraganaChar({ char, size = 96 }: HiraganaCharProps) {
  // Youon/gairaigo combos (きゃ, ディ, ...) are two glyphs read side by side as one mora —
  // the base font size is tuned for a single glyph, so a 2-character string needs a smaller
  // size plus nowrap or it wraps onto two lines (each glyph stacked vertically), which reads
  // as two separate characters instead of one combined sound.
  const fontSize = char.length > 1 ? size * 0.4 : size * 0.6
  return (
    <div
      role="img"
      aria-label={char}
      style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: size * 0.2,
        background: 'var(--color-bg-soft)',
        fontSize,
        fontWeight: 700,
        color: 'var(--color-text)',
        lineHeight: 1,
        whiteSpace: 'nowrap',
      }}
    >
      {char}
    </div>
  )
}
