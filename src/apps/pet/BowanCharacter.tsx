export function BowanCharacter({ sleeping }: { sleeping: boolean }) {
  return (
    <svg
      className="bowan-character"
      viewBox="0 0 360 340"
      role="img"
      aria-labelledby="bowan-character-title"
    >
      <title id="bowan-character-title">胖乎乎的小狼波万</title>

      <ellipse className="bowan-shadow" cx="185" cy="294" rx="120" ry="22" />
      <path
        className="bowan-tail"
        d="M275 225c42-30 66 4 45 29-13 16-40 12-53-2 17 4 31-6 27-17-3-8-12-7-19-2z"
      />
      <ellipse className="bowan-body" cx="190" cy="230" rx="104" ry="72" />
      <path className="bowan-chest" d="M132 202c20 8 34 30 38 73-26-3-48-13-61-31 3-21 10-34 23-42z" />

      <ellipse className="bowan-leg" cx="130" cy="278" rx="40" ry="25" />
      <ellipse className="bowan-leg" cx="243" cy="278" rx="40" ry="25" />
      <path className="bowan-toes" d="M114 281c8 4 19 5 30 1M226 282c9 3 20 3 30-1" />

      <path className="bowan-ear" d="M104 88 82 28c-2-7 7-12 13-7l48 39z" />
      <path className="bowan-ear" d="m226 60 48-39c6-5 15 0 13 7l-22 61z" />
      <path className="bowan-ear-inner" d="m103 68-10-30 29 24z" />
      <path className="bowan-ear-inner" d="m247 62 29-24-10 31z" />

      <path
        className="bowan-head"
        d="M86 121c6-47 43-77 98-77 56 0 94 31 100 79 6 48-25 93-99 94-74 0-106-46-99-96z"
      />
      <path className="bowan-brow" d="M118 111c17-11 31-11 44-5M208 106c14-6 29-5 44 5" />

      {sleeping ? (
        <>
          <path className="bowan-eye-line" d="M121 132c11 9 23 9 34 0M214 132c11 9 23 9 34 0" />
          <text className="bowan-sleep-mark" x="270" y="82">
            z
          </text>
          <text className="bowan-sleep-mark small" x="289" y="62">
            z
          </text>
        </>
      ) : (
        <>
          <ellipse className="bowan-eye" cx="139" cy="132" rx="12" ry="15" />
          <ellipse className="bowan-eye" cx="231" cy="132" rx="12" ry="15" />
          <circle className="bowan-eye-glint" cx="143" cy="127" r="3.5" />
          <circle className="bowan-eye-glint" cx="235" cy="127" r="3.5" />
        </>
      )}

      <ellipse className="bowan-muzzle" cx="185" cy="167" rx="48" ry="35" />
      <path className="bowan-nose" d="M169 153c8-7 24-7 32 0 3 3 1 9-3 12l-10 6c-2 1-4 1-6 0l-10-6c-5-3-6-9-3-12z" />
      <path className="bowan-mouth" d="M185 171v9m0 0c-8 8-17 8-24 3m24-3c8 8 17 8 24 3" />

      <path className="bowan-cheek" d="M109 163c8 6 18 8 28 5M233 168c10 3 20 1 28-5" />
      <path className="bowan-collar" d="M119 201c35 24 99 24 135 0l-5 23c-37 20-88 20-125 0z" />
      <circle className="bowan-tag" cx="185" cy="225" r="15" />
      <path className="bowan-tag-mark" d="M178 225h14M185 218v14" />
    </svg>
  )
}
