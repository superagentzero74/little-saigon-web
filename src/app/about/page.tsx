import type { Metadata } from "next";
import Link from "next/link";
import { MapPin, Star, Gift, Utensils, Store, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "About",
  description: "Little Saigon is the community-driven guide to 800+ Vietnamese restaurants, businesses, and services in Westminster, Garden Grove & Fountain Valley.",
};

const stats = [
  { value: "800+", label: "Businesses Listed" },
  { value: "7", label: "Categories" },
  { value: "50", label: "Top Dishes Ranked" },
  { value: "3", label: "Cities Covered" },
];

const features = [
  {
    icon: Store,
    title: "Discover Local Businesses",
    description:
      "Browse 800+ Vietnamese restaurants, bakeries, cafes, salons, and services across Little Saigon.",
  },
  {
    icon: Utensils,
    title: "Top 50 Món Việt Guide",
    description:
      "Our curated guide to the 50 must-try Vietnamese dishes, complete with where to find the best versions.",
  },
  {
    icon: Gift,
    title: "Rewards & Check-ins",
    description:
      "Check in at businesses, earn points, and redeem rewards. Support local and get rewarded for it.",
  },
  {
    icon: Star,
    title: "Reviews & Ratings",
    description:
      "Read honest community reviews and share your own experiences to help fellow diners and shoppers.",
  },
  {
    icon: MapPin,
    title: "Explore by Location",
    description:
      "Find businesses near you across Westminster, Garden Grove, and Fountain Valley.",
  },
  {
    icon: Heart,
    title: "Đỉnh Nhất Picks",
    description:
      "Handpicked top choices in every category, selected by local experts and community votes.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-ls-primary text-white py-[60px]">
        <div className="ls-container text-center max-w-2xl mx-auto">
          <h1 className="text-[32px] font-bold leading-tight">
            Xin Chào! Welcome to Little Saigon
          </h1>
          <p className="text-[16px] text-white/70 mt-lg leading-relaxed">
            The community-driven guide to Vietnamese businesses and culture in Southern California.
            Built for the diaspora, by the diaspora.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section className="ls-container py-3xl">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-lg">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-[32px] font-bold text-ls-primary">{stat.value}</p>
              <p className="text-meta text-ls-secondary mt-xs">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="bg-ls-surface py-3xl">
        <div className="ls-container max-w-2xl mx-auto text-center">
          <h2 className="text-section-header font-bold text-ls-primary">Our Mission</h2>
          <p className="text-body text-ls-body mt-lg leading-relaxed">
            Little Saigon is home to the largest Vietnamese community outside of Vietnam.
            From phở spots and bánh mì shops to nail salons and herbal pharmacies, this
            neighborhood is a living, breathing piece of Vietnamese culture. Our mission is to
            make it easier for everyone to discover, support, and celebrate these businesses.
          </p>
          <p className="text-body text-ls-body mt-lg leading-relaxed">
            Whether you grew up in Little Saigon, just moved to the area, or are visiting for the
            first time, this app is your guide to the best of Vietnamese-American life in Orange County.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="ls-container py-3xl">
        <h2 className="text-section-header font-bold text-ls-primary text-center mb-2xl">
          What You Can Do
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg max-w-4xl mx-auto">
          {features.map((feature) => (
            <div key={feature.title} className="ls-card">
              <div className="w-10 h-10 rounded-card bg-ls-surface flex items-center justify-center mb-md">
                <feature.icon size={20} className="text-ls-primary" />
              </div>
              <h3 className="text-card-title font-semibold text-ls-primary">{feature.title}</h3>
              <p className="text-meta text-ls-secondary mt-sm leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ls-primary text-white py-3xl">
        <div className="ls-container text-center">
          <h2 className="text-[22px] font-bold">Start Exploring</h2>
          <p className="text-[15px] text-white/70 mt-sm max-w-md mx-auto">
            Discover the best Vietnamese businesses, dishes, and hidden gems in Little Saigon.
          </p>
          <div className="flex items-center justify-center gap-md mt-xl">
            <Link
              href="/explore"
              className="inline-block bg-white text-ls-primary rounded-btn px-6 py-3 text-[14px] font-semibold hover:opacity-90 transition-opacity"
            >
              Explore Businesses
            </Link>
            <Link
              href="/guide"
              className="inline-block border border-white/30 text-white rounded-btn px-6 py-3 text-[14px] font-semibold hover:bg-white/10 transition-colors"
            >
              Top 50 Món Việt
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
