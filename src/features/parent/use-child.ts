import { useEffect, useState } from "react"

import { useSchool } from "@/data/store"

export function useChild() {
  const { state } = useSchool()
  const stored = localStorage.getItem("eduvia-child")
  const options = state.students
  const defaultId = options[0]?.id ?? ""
  const [selected, setChildId] = useState(() =>
    stored && options.some((s) => s.id === stored) ? stored : defaultId
  )
  const childId = options.some((s) => s.id === selected) ? selected : defaultId
  useEffect(() => {
    if (childId) localStorage.setItem("eduvia-child", childId)
  }, [childId])
  const child = options.find((student) => student.id === childId) ?? options[0]
  return { state, child, childId, setChildId, options }
}
