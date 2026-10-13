/** CLS timetable cell tints (Figma 95-52284). */
export type SubjectCellTheme = {
  background: string
  border: string
  subject: string
  teacher: string
}

const NAMED_THEMES: { keys: string[]; theme: SubjectCellTheme }[] = [
  {
    keys: ["english", "eng"],
    theme: {
      background: "#E0F2FE",
      border: "#BAE6FD",
      subject: "#0284C7",
      teacher: "#0369A1",
    },
  },
  {
    keys: ["math", "mathematics", "mth"],
    theme: {
      background: "#F3E8FF",
      border: "#E9D5FF",
      subject: "#9333EA",
      teacher: "#7E22CE",
    },
  },
  {
    keys: ["urdu"],
    theme: {
      background: "#ECFDF5",
      border: "#A7F3D0",
      subject: "#059669",
      teacher: "#047857",
    },
  },
  {
    keys: ["physics", "phy"],
    theme: {
      background: "#FFFBEB",
      border: "#FDE68A",
      subject: "#B45309",
      teacher: "#92400E",
    },
  },
  {
    keys: ["chemistry", "chem"],
    theme: {
      background: "#FFE4E6",
      border: "#FECDD3",
      subject: "#E11D48",
      teacher: "#BE123C",
    },
  },
  {
    keys: ["computer", "ict", "it"],
    theme: {
      background: "#F1F5F9",
      border: "#E2E8F0",
      subject: "#475569",
      teacher: "#334155",
    },
  },
  {
    keys: ["biology", "bio"],
    theme: {
      background: "#DCFCE7",
      border: "#BBF7D0",
      subject: "#166534",
      teacher: "#14532D",
    },
  },
  {
    keys: ["islam", "islamiat"],
    theme: {
      background: "#E8F7EE",
      border: "#A8D5BC",
      subject: "#1A5C3A",
      teacher: "#14532D",
    },
  },
  {
    keys: ["history", "geo", "geography"],
    theme: {
      background: "#FEF3C7",
      border: "#FDE68A",
      subject: "#B45309",
      teacher: "#92400E",
    },
  },
]

const FALLBACK_THEMES: SubjectCellTheme[] = [
  {
    background: "#E0F2FE",
    border: "#BAE6FD",
    subject: "#0284C7",
    teacher: "#0369A1",
  },
  {
    background: "#F3E8FF",
    border: "#E9D5FF",
    subject: "#9333EA",
    teacher: "#7E22CE",
  },
  {
    background: "#ECFDF5",
    border: "#A7F3D0",
    subject: "#059669",
    teacher: "#047857",
  },
  {
    background: "#FFE4E6",
    border: "#FECDD3",
    subject: "#E11D48",
    teacher: "#BE123C",
  },
]

function hashSubject(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

export function subjectCellTheme(subjectName: string): SubjectCellTheme {
  const key = subjectName.trim().toLowerCase()
  if (!key) {
    return FALLBACK_THEMES[0]
  }
  for (const entry of NAMED_THEMES) {
    if (entry.keys.some((token) => key.includes(token))) {
      return entry.theme
    }
  }
  return FALLBACK_THEMES[hashSubject(key) % FALLBACK_THEMES.length]
}
