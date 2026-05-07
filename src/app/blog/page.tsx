"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { getBlogPosts } from "@/lib/services";
import type { BlogPost } from "@/lib/types";

function AuthorAvatar({ name, size = 20 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="rounded-full bg-ls-primary text-white flex items-center justify-center font-semibold flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials}
    </div>
  );
}

export default function BlogListPage() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    getBlogPosts({ status: "published" })
      .then(setPosts)
      .catch(() => setPosts([]));
  }, []);

  return (
    <div className="ls-container ls-section">
      <div className="mb-xl">
        <h1 className="text-page-title text-ls-primary">Blog</h1>
        <p className="text-meta text-ls-secondary mt-xs">
          Stories, guides, and news from Little Saigon
        </p>
      </div>

      {posts === null ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="w-full aspect-[16/9] bg-ls-surface rounded-card" />
              <div className="h-5 bg-ls-surface rounded mt-md w-3/4" />
              <div className="h-3 bg-ls-surface rounded mt-sm w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-3xl">
          <p className="text-body text-ls-secondary">No posts yet. Check back soon!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
          {posts.map((post) => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <div className="ls-card overflow-hidden">
                {post.coverImageURL ? (
                  <div className="relative w-full aspect-[16/9]">
                    <Image
                      src={post.coverImageURL}
                      alt={post.title}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[16/9] bg-ls-surface flex items-center justify-center">
                    <span className="text-ls-secondary text-[32px]">📝</span>
                  </div>
                )}
                <div className="p-md">
                  <h2 className="text-card-title text-ls-primary group-hover:text-ls-primary/80 transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  <p className="text-meta text-ls-secondary mt-xs line-clamp-2">
                    {post.excerpt || post.body.slice(0, 120)}
                  </p>
                  <div className="flex items-center gap-xs mt-sm">
                    <AuthorAvatar name={post.author} size={20} />
                    <span className="text-[11px] text-ls-secondary">{post.author}</span>
                    {post.publishedAt?.toDate && (
                      <>
                        <span className="text-[11px] text-ls-secondary">·</span>
                        <span className="text-[11px] text-ls-secondary">
                          {post.publishedAt.toDate().toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                  {post.tags.length > 0 && (
                    <div className="flex gap-xs flex-wrap mt-sm">
                      {post.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] bg-ls-surface text-ls-secondary px-[6px] py-[1px] rounded-full">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
