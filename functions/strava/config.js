import { defineSecret } from 'firebase-functions/params'

// Set with: firebase functions:secrets:set STRAVA_CLIENT_SECRET (etc.)
export const STRAVA_CLIENT_ID = defineSecret('STRAVA_CLIENT_ID')
export const STRAVA_CLIENT_SECRET = defineSecret('STRAVA_CLIENT_SECRET')
export const STRAVA_VERIFY_TOKEN = defineSecret('STRAVA_VERIFY_TOKEN')

export const STRAVA_OAUTH_TOKEN_URL = 'https://www.strava.com/oauth/token'
export const STRAVA_API_BASE = 'https://www.strava.com/api/v3'
export const STRAVA_SCOPE = 'read,activity:read'

export const STRAVA_SECRETS = [
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_VERIFY_TOKEN,
]
