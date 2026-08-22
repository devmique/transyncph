import { NextResponse, NextRequest } from 'next/server'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { getDatabase } from '@/lib/mongodb'
import { Resend } from 'resend'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const resend = new Resend(process.env.RESEND_API_KEY)
const FORGOT_RATE_LIMIT_MAX_REQUESTS = 3
const FORGOT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

export async function POST(req: NextRequest) {
  try {
     // Rate limit by IP
     const clientIp = getClientIp(req.headers)
     const rateLimitResult = checkRateLimit(`forgot-password:${clientIp}`, {
       maxRequests: FORGOT_RATE_LIMIT_MAX_REQUESTS,
       windowMs: FORGOT_RATE_LIMIT_WINDOW_MS,
     })
 
     if (!rateLimitResult.allowed) {
       const retryAfterSeconds = Math.max(
         1,
         Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000)
       )
 
       return NextResponse.json(
         { error: 'Too many requests. Please try again later.' },
         {
           status: 429,
           headers: { 'Retry-After': retryAfterSeconds.toString() },
         }
       )
     }
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const db = await getDatabase()

    // Look up user — don't reveal whether the email exists
    const user = await db.collection('operators').findOne({ email: email.toLowerCase().trim() })

    if (user) {
      // Generate a secure random token
      const rawToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = await bcrypt.hash(rawToken, 10)
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60) // 1 hour

      // Upsert: one active reset token per user at a time
      await db.collection('password_reset_tokens').updateOne(
        { userId: user._id },
        {
          $set: {
            userId: user._id,
            email: user.email,
            tokenHash: hashedToken,
            expiresAt,
            createdAt: new Date(),
          },
        },
        { upsert: true }
      )

      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`

      await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev',
        to: user.email,
        subject: 'Reset your TranSync PH password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#0f172a">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:32px">
              <div style="width:36px;height:36px;background:#2563eb;border-radius:8px;display:flex;align-items:center;justify-content:center">
                <span style="color:#fff;font-weight:700;font-size:14px">RS</span>
              </div>
              <span style="font-weight:700;font-size:16px">Route<span style="color:#3b82f6">Sync</span> PH</span>
            </div>
            <h1 style="font-size:22px;font-weight:700;margin:0 0 8px">Reset your password</h1>
            <p style="font-size:14px;color:#64748b;margin:0 0 24px;line-height:1.6">
              We received a request to reset the password for your TranSync PH account.
              Click the button below — this link expires in <strong>1 hour</strong>.
            </p>
            <a href="${resetUrl}"
               style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px">
              Reset password
            </a>
            <p style="font-size:12px;color:#94a3b8;margin:24px 0 0;line-height:1.6">
              If you didn't request this, you can safely ignore this email.
              Your password will not change.
            </p>
          </div>
        `,
      })
    }

    // Always return 200 to avoid user enumeration
    return NextResponse.json({
      message: 'If an account exists for that email, a reset link has been sent.',
    })
  } catch (err) {
    console.error('[forgot-password]', err)
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}