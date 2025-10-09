"""Vector assets expressed as inline SVG strings."""
from __future__ import annotations

AVATAR_SVG = """
<svg width="400" height="400" viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="avatar-bg" cx="50%" cy="40%" r="65%">
      <stop offset="0%" stop-color="#93C5FD" />
      <stop offset="70%" stop-color="#3B82F6" />
      <stop offset="100%" stop-color="#1D4ED8" />
    </radialGradient>
  </defs>
  <circle cx="200" cy="200" r="180" fill="url(#avatar-bg)"/>
  <circle cx="200" cy="170" r="80" fill="#FDE68A" stroke="#F59E0B" stroke-width="6"/>
  <circle cx="175" cy="160" r="12" fill="#1E293B"/>
  <circle cx="225" cy="160" r="12" fill="#1E293B"/>
  <path d="M155 205 Q200 245 245 205" stroke="#1E293B" stroke-width="8" fill="none" stroke-linecap="round"/>
  <path d="M110 315 Q200 260 290 315" fill="#F8FAFC" stroke="#1E3A8A" stroke-width="6" />
  <path d="M90 320 Q200 390 310 320" fill="#1D4ED8" opacity="0.2"/>
  <circle cx="120" cy="95" r="18" fill="#FBBF24" opacity="0.6"/>
  <circle cx="290" cy="80" r="12" fill="#F472B6" opacity="0.5"/>
</svg>
"""

BADGE_SVGS = {
    "star": """
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="95" fill="#FDE68A" stroke="#F59E0B" stroke-width="8" />
          <path d="M100 30 L118 78 L170 78 L128 110 L144 162 L100 132 L56 162 L72 110 L30 78 L82 78 Z"
                fill="#F59E0B" stroke="#B45309" stroke-width="6" stroke-linejoin="round" />
        </svg>
    """,
    "rocket": """
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="160" height="160" rx="32" fill="#BFDBFE" stroke="#3B82F6" stroke-width="8" />
          <path d="M100 40 L130 110 L100 100 L70 110 Z" fill="#2563EB" />
          <circle cx="100" cy="80" r="16" fill="#F8FAFC" />
          <path d="M86 122 L100 160 L114 122 Z" fill="#F97316" />
          <path d="M76 140 L100 170 L124 140" fill="none" stroke="#FB923C" stroke-width="6" stroke-linecap="round" />
        </svg>
    """,
    "heart": """
        <svg width="200" height="200" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
          <rect x="20" y="20" width="160" height="160" rx="48" fill="#FBCFE8" stroke="#EC4899" stroke-width="8" />
          <path d="M100 150 C10 80 60 40 100 80 C140 40 190 80 100 150 Z" fill="#EC4899" />
        </svg>
    """,
}
