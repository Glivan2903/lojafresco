import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isStoreOpen(date: Date = new Date()): boolean {
  const day = date.getDay()
  const hour = date.getHours()
  const minute = date.getMinutes()

  // Sunday (0) is closed
  if (day === 0) return false

  // Saturday (6) is 08:00 - 13:00
  if (day === 6) {
    if (hour < 8) return false
    if (hour >= 13) return false
    return true
  }

  // Weekdays (1-5) are 08:00 - 17:30
  if (hour < 8) return false
  if (hour > 17) return false
  if (hour === 17 && minute > 30) return false

  return true
}

export function getNextBusinessDay(date: Date = new Date()): Date {
  const nextDate = new Date(date)

  // Advance until open
  // Safety break to prevent infinite loops if logic fails (e.g. always closed)
  let sanityCheck = 0
  while (!isStoreOpen(nextDate) && sanityCheck < 30) {
    sanityCheck++
    const day = nextDate.getDay()
    const hour = nextDate.getHours()

    // If it's closed because it's too early today (and not Sunday), just wait until 8am
    if (hour < 8 && day !== 0) {
      nextDate.setHours(8, 0, 0, 0)
      if (isStoreOpen(nextDate)) return nextDate
    }

    // Otherwise, likely closed because it's late or it's Sunday
    // Advance to next day 8am
    nextDate.setDate(nextDate.getDate() + 1)
    nextDate.setHours(8, 0, 0, 0)
  }

  return nextDate
}
