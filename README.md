# Little Saigon Web

The full-featured web version of the Little Saigon app — a community-first guide to Vietnamese restaurants, services, and businesses in Westminster, Garden Grove, and Fountain Valley. Feature parity with the iOS app.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS (matching iOS design system tokens)
- **Database**: Firebase / Cloud Firestore (shared with iOS app)
- **Auth**: Firebase Auth (Email/Password, Google, Apple)
- **Storage**: Firebase Storage (photo uploads)
- **Location**: Browser Geolocation API (check-in verification)
- **Hosting**: Vercel
- **Icons**: Lucide React

## Routes & Features

| Route | Description | Auth Required |
|---|---|---|
| `/` | Homepage — hero, search, categories, Top 50 teaser, Top Rated | No |
| `/login` | Sign In / Sign Up — Email, Google, Apple + Forgot Password | No |
| `/explore` | All businesses — search, category filter, sort | No |
| `/business/[slug]` | Business detail — photos, hours, reviews, check-in, favorite, photo upload | Partial |
| `/guide` | Top 50 Món Việt — all 50 dishes organized by section | No |
| `/guide/[slug]` | Dish detail — description, history, check-off tracker, Find It Nearby | Partial |
| `/category/[slug]` | Category landing — filtered business list | No |
| `/rewards` | Rewards — earn points, redeem rewards, history | Yes |
| `/profile` | User profile — stats, favorites, edit name, change password | Yes |

## Business Categories

| Category | Examples |
|---|---|
| Restaurant | Phở shops, bánh mì, Vietnamese cuisine |
| Bakery | Vietnamese bakeries, pastry shops |
| Cafe | Coffee shops, boba, juice bars |
| Grocery | Asian markets, specialty stores |
| Beauty & Nails | Nail salons, hair salons, spas |
| Shopping | Retail, gift shops, jewelry |
| Business | Professional services, offices |

## Interactive Features (matching iOS app)

| Feature | Points | Details |
|---|---|---|
| Write Review | +25 pts | Star picker (1–5), 500 char limit, one per business |
| Check In | +10 pts | Geo-verified (200m radius), browser location API |
| Upload Photo | +15 pts | Tag with category, stored in Firebase Storage |
| Check off Top 50 Dish | +5 pts | Track which of the 50 dishes you've tried |
| Redeem Rewards | — | Spend points on business rewards |
| Favorite/Save | — | Heart button, syncs to user profile |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout + SEO metadata
│   ├── providers.tsx       # AuthProvider + LocationProvider
│   ├── page.tsx            # Homepage
│   ├── login/page.tsx      # Auth (sign in / sign up / forgot password)
│   ├── explore/page.tsx    # All businesses listing
│   ├── business/[slug]/    # Business detail (singular)
│   ├── guide/
│   │   ├── page.tsx        # Top 50 Món Việt listing
│   │   └── [slug]/page.tsx # Dish detail + check-off
│   ├── category/[slug]/    # Category landing pages
│   ├── profile/page.tsx    # User profile + edit
│   └── rewards/page.tsx    # Points & rewards
├── components/
│   ├── business/           # BusinessCard, BusinessFeaturedCard
│   ├── guide/              # DishCard
│   ├── layout/             # Header, Footer
│   └── ui/                 # StarRating, CategoryPills, OpenStatus
├── contexts/
│   ├── AuthContext.tsx      # Firebase Auth state + methods
│   └── LocationContext.tsx  # Browser geolocation for check-ins
├── lib/
│   ├── firebase.ts         # Firebase init (Auth, Firestore, Storage)
│   ├── services.ts         # All Firestore read/write operations
│   ├── types.ts            # TypeScript types matching Firestore schema
│   └── utils.ts            # Slug generation, open/closed, formatting
└── styles/
    └── globals.css         # Tailwind + design system utility classes
```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env.local
# Fill in your Firebase API key, App ID, and Google Maps key

# 3. Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web App ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | Google Maps JavaScript API key |

## Deployment (Vercel)

1. Push to GitHub
2. Import repo in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — automatic on every push to `main`

## SEO

Every page is indexable. The site generates 470+ unique URLs:
- 420+ business pages (`/business/[slug]`)
- 50 dish pages (`/guide/[slug]`)
- 7 category landing pages (`/category/[slug]`)

## Future Enhancements

- [ ] SSR/SSG for all pages (convert client components to server components)
- [ ] `next-sitemap` for automatic sitemap generation
- [ ] JSON-LD structured data (LocalBusiness schema for Google rich snippets)
- [ ] Google Maps embed on business detail pages
- [ ] Đỉnh Nhất (Best Picks) page
- [ ] Algolia or Typesense search (replace client-side filter)
- [ ] Image optimization pipeline
- [ ] Expanded categories (events, community orgs, health services)
