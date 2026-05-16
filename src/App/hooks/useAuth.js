import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../../firebase'
import {
  getUserProfile,
  createUserProfile,
  onUserProfileSnapshot,
} from '../../userService'

export function useAuth() {
  const [user, setUser] = useState(undefined)
  const [userProfile, setUserProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState('')

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u))
    return unsub
  }, [])

  useEffect(() => {
    if (!user) {
      setUserProfile(null)
      setProfileError('')
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    setProfileError('')
    let cancelled = false
    let unsubProfile = null

    async function initProfile() {
      try {
        const existing = await getUserProfile(user.uid)
        if (cancelled) return

        if (!existing) {
          const fallbackName = user.email?.split('@')[0] || 'bruker'
          await createUserProfile(user.uid, user.email || '', fallbackName, 'athlete')
        }
        if (cancelled) return

        unsubProfile = onUserProfileSnapshot(user.uid, profile => {
          if (!cancelled) {
            setUserProfile(profile)
            setProfileLoading(false)
          }
        })
      } catch (error) {
        console.error('Failed to initialize user profile', error)
        if (!cancelled) {
          setUserProfile(null)
          setProfileError('Kunne ikke laste brukerprofilen. Prøv å laste siden på nytt.')
          setProfileLoading(false)
        }
      }
    }

    initProfile()

    return () => {
      cancelled = true
      if (unsubProfile) unsubProfile()
    }
  }, [user])

  return { user, userProfile, profileLoading, profileError }
}
