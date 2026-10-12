interface HiraganaCharProps {
  char: string
  /** px, or a CSS length (e.g. one in container units) for a box that grows with its slot. */
  size?: number | string
}

export function HiraganaChar({ char, size = 96 }: HiraganaCharProps) {
  // Youon/gairaigo combos (きゃ, ディ, ...) are two glyphs read side by side as one mora —
  // the base font size is tuned for a single glyph, so a 2-character string needs a smaller
  // size plus nowrap or it wraps onto two lines (each glyph stacked vertically), which reads
  // as two separate characters instead of one combined sound.
  const fontScale = char.length > 1 ? 0.4 : 0.6
  const box = typeof size === 'number' ? `${size}px` : size
  return (
    <div
      role="img"
      aria-label={char}
      style={{
        width: box,
        height: box,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: `calc(${box} * 0.2)`,
        background: 'var(--color-bg-soft)',
        fontSize: `calc(${box} * ${fontScale})`,
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
