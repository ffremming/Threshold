import { useEffect, useState } from 'react'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'
import { mergeTemplates } from '../../templateLibrary'

export function useTemplates(userProfile) {
  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)

  useEffect(() => {
    setLoadingTemplates(true)
    if (!userProfile?.uid) {
      setTemplates(mergeTemplates())
      setLoadingTemplates(false)
      return
    }

    const unsub = onSnapshot(
      query(collection(db, 'templates'), where('ownerId', '==', userProfile.uid)),
      snap => {
        const customTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        setTemplates(mergeTemplates(customTemplates))
        setLoadingTemplates(false)
      },
      err => {
        console.error('useTemplates listen error:', err)
        setTemplates(mergeTemplates())
        setLoadingTemplates(false)
      },
    )
    return unsub
  }, [userProfile?.uid])

  return { templates, loadingTemplates }
}
