# Firebase Setup for Little Saigon Web

Your iOS app and admin dashboard already use Firebase project `little-saigon-c055a`. The web app connects to the same project — same Firestore, same Auth, same Storage.

## Step 1: Register a Web App in Firebase

You may already have a web app registered (for the admin dashboard). If so, skip to Step 2.

1. Go to [Firebase Console](https://console.firebase.google.com/project/little-saigon-c055a/settings/general)
2. Scroll to **"Your apps"** at the bottom
3. If you see a Web app (`</>` icon), click it to view the config
4. If not, click **"Add app"** → select **Web** (`</>`)
   - App nickname: `Little Saigon Web`
   - ☐ Don't check "Firebase Hosting" (we're using Vercel)
   - Click **Register app**
5. Copy the `firebaseConfig` object — you need `apiKey` and `appId`

## Step 2: Fill in .env.local

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...your-api-key...
NEXT_PUBLIC_FIREBASE_APP_ID=1:570934597896:web:...your-app-id...
NEXT_PUBLIC_GOOGLE_MAPS_KEY=AIzaSy...your-maps-key...
```

**Where to find each value:**
- `FIREBASE_API_KEY` → Firebase Console → Project Settings → Your apps → Web app → `apiKey`
- `FIREBASE_APP_ID` → Same place → `appId`  
- `GOOGLE_MAPS_KEY` → Same key as your `seed/.env` `GOOGLE_PLACES_API_KEY`, or Google Cloud Console → APIs & Services → Credentials (project `570934597896`)

## Step 3: Add Authorized Domains for Auth

Firebase Auth needs to know which domains can use sign-in:

1. Go to [Firebase Auth Settings](https://console.firebase.google.com/project/little-saigon-c055a/authentication/settings)
2. Under **Authorized domains**, add:
   - `localhost` (should already be there)
   - Your Vercel preview domain (e.g., `little-saigon-web.vercel.app`)
   - Your custom domain when ready (e.g., `littlesaigon.app`)

## Step 4: Google Sign-In for Web

Google Sign-In on web uses a different flow than iOS (popup instead of native SDK). It should work automatically since:
- Your Google Cloud project (`570934597896`) already has OAuth configured
- Firebase Auth's Google provider handles the web OAuth client automatically

If you get a redirect error, check:
1. Google Cloud Console → APIs & Services → OAuth consent screen → make sure it's published (not "Testing")
2. Google Cloud Console → Credentials → OAuth 2.0 Client IDs → the "Web client" should have your domains in Authorized redirect URIs

## Step 5: Apple Sign-In for Web

Apple Sign-In on web requires additional setup beyond the iOS entitlement:

1. Go to [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
2. Register a **Services ID**:
   - Description: `Little Saigon Web`
   - Identifier: `com.productsgo.littlesaigon.web` (or similar)
   - Enable **Sign in with Apple**
   - Configure domains: add your web domain and return URL
   - Return URL: `https://little-saigon-c055a.firebaseapp.com/__/auth/handler`
3. In Firebase Console → Authentication → Sign-in method → Apple:
   - Add the Services ID
   - Add your Apple Team ID

**Note:** Apple Sign-In can be added later. Email + Google are enough to launch.

## Step 6: Firestore Composite Indexes

When you first load pages with compound queries, Firestore will log errors with links to create the required indexes. Just click each link — they take about 2 minutes to build.

Expected indexes needed:
- `businesses` → `category` ASC, `rating` DESC
- `reviews` → `businessId` ASC, `createdAt` DESC
- `checkIns` → `userId` ASC, `timestamp` DESC
- `redemptions` → `userId` ASC, `redeemedAt` DESC

## Step 7: Google Maps API Key

For the Maps JavaScript API (used for static map images on business pages):

1. Go to [Google Cloud Console → APIs & Services](https://console.cloud.google.com/apis/library?project=570934597896)
2. Enable **Maps JavaScript API** (if not already)
3. Enable **Maps Static API** (if not already)
4. Use the same API key from your seed scripts, or create a new one with HTTP referrer restrictions for your domains

## Quick Checklist

- [ ] Web app registered in Firebase Console
- [ ] `.env.local` filled with apiKey, appId, mapsKey
- [ ] `localhost` in Firebase Auth authorized domains
- [ ] Google Sign-In works (test locally)
- [ ] Firestore indexes created (click through error links)
- [ ] `npm run dev` shows homepage with data from Firestore
