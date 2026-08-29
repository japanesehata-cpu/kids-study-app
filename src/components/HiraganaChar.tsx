interface HiraganaCharProps {
  char: string
  size?: number
}

export function HiraganaChar({ char, size = 96 }: HiraganaCharProps) {
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
        fontSize: size * 0.6,
        fontWeight: 700,
        color: 'var(--color-text)',
        lineHeight: 1,
      }}
    >
      {char}
    </div>
  )
}
