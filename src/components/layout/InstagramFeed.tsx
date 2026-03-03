"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Instagram, Play } from "lucide-react";
import type { InstagramPost } from "@/app/api/instagram/route";

export default function InstagramFeed() {
  const [posts, setPosts] = useState<InstagramPost[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/instagram")
      .then((r) => r.json())
      .then((data) => {
        setPosts(data.posts || []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  // Don't render the section if no posts
  if (loaded && posts.length === 0) return null;

  return (
    <div className="border-t border-ls-border py-2xl">
      <div className="ls-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-lg">
          <div className="flex items-center gap-sm">
            <Instagram size={18} className="text-ls-primary" />
            <span className="text-[14px] font-semibold text-ls-primary">@littlesaigon.official</span>
          </div>
          <a
            href="https://www.instagram.com/littlesaigon.official/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[12px] text-ls-secondary hover:text-ls-primary transition-colors font-medium"
          >
            Follow →
          </a>
        </div>

        {/* Post strip */}
        {!loaded ? (
          // Skeleton
          <div className="flex gap-sm overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] bg-ls-surface rounded-btn animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex gap-sm overflow-x-auto scrollbar-hide pb-xs">
            {posts.map((post) => (
              <a
                key={post.id}
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-shrink-0 w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] rounded-btn overflow-hidden relative group bg-ls-surface"
              >
                <Image
                  src={post.media_type === "VIDEO" && post.thumbnail_url ? post.thumbnail_url : post.media_url}
                  alt="Instagram post"
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="140px"
                  unoptimized
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                  {post.media_type === "VIDEO" && (
                    <Play size={24} className="text-white drop-shadow opacity-80" />
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
