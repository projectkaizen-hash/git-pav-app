"use client"

import { signInWithGoogle } from '@/lib/firebase/client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'

export function GoogleLoginButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const idToken = await signInWithGoogle()
      const res = await fetch('/api/v1/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Google login failed')
      toast.success('Logged in with Google')
      router.push('/profile')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google login error'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={loading} className="w-full">
      {loading ? 'Signing in...' : 'Continue with Google'}
    </Button>
  )
}

