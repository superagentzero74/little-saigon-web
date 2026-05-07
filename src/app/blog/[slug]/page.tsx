"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import OptImage from "@/components/ui/OptImage";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getBlogPostBySlug, getBlogAuthor } from "@/lib/services";
import type { BlogPost, BlogAuthor } from "@/lib/types";

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [author, setAuthor] = useState<BlogAuthor | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    getBlogPostBySlug(params.slug)
      .then(async (p) => {
        setPost(p);
        if (p?.authorSlug) {
          const a = await getBlogAuthor(p.authorSlug);
          setAuthor(a);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="ls-container ls-section">
        <div className="max-w-3xl mx-auto animate-pulse">
          <div className="h-8 bg-ls-surface rounded w-3/4 mb-md" />
          <div className="w-full aspect-[16/9] bg-ls-surface rounded-card mb-lg" />
          <div className="space-y-sm">
            <div className="h-4 bg-ls-surface rounded" />
            <div className="h-4 bg-ls-surface rounded" />
            <div className="h-4 bg-ls-surface rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="ls-container ls-section text-center">
        <p className="text-body text-ls-secondary">Post not found</p>
        <Link href="/blog" className="ls-btn inline-block mt-lg">Back to Blog</Link>
      </div>
    );
  }

  const images = post.images || [];

  return (
    <div className="ls-container ls-section">
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/blog" className="flex items-center gap-xs text-meta text-ls-secondary hover:text-ls-primary transition-colors mb-lg">
          <ChevronLeft size={14} /> Back to Blog
        </Link>

        {/* Title */}
        <h1 className="text-[28px] md:text-[36px] font-bold text-ls-primary mb-sm leading-tight">{post.title}</h1>

        {/* Author + date */}
        <div className="flex items-center gap-sm mb-xl">
          <AuthorAvatar name={post.author} avatarURL={author?.avatarURL} size={36} />
          <div>
            <span className="text-[14px] font-medium text-ls-primary">{post.author}</span>
            {post.publishedAt?.toDate && (
              <p className="text-[12px] text-ls-secondary">
                {post.publishedAt.toDate().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Cover image — full width, natural aspect ratio */}
        {images.length > 0 && (
          <div className="mb-xl">
            <OptImage
              src={images[currentImage]}
              alt={post.title}
              width={1200}
              height={675}
              sizes="(min-width: 768px) 768px, 100vw"
              className="w-full h-auto rounded-card"
              priority
            />
            {/* Thumbnail strip for multiple images */}
            {images.length > 1 && (
              <div className="flex gap-sm mt-sm overflow-x-auto pb-xs scrollbar-hide">
                {images.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImage(idx)}
                    className={`flex-shrink-0 w-[64px] h-[64px] rounded overflow-hidden border-2 transition-colors ${
                      currentImage === idx ? "border-ls-primary" : "border-transparent opacity-60"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex gap-xs flex-wrap mb-lg">
            {post.tags.map((tag) => (
              <span key={tag} className="text-[12px] bg-ls-surface text-ls-secondary px-md py-xs rounded-full">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Body — Markdown rendered */}
        <article className="text-[16px] text-ls-body leading-[1.8]">
          <MarkdownRenderer content={post.body} />
        </article>

        {/* Author bio card */}
        {author && (
          <div className="mt-xl pt-lg border-t border-ls-surface">
            <div className="flex items-start gap-md">
              <AuthorAvatar name={author.name} avatarURL={author.avatarURL} size={48} />
              <div>
                <p className="text-[14px] font-semibold text-ls-primary">Written by {author.name}</p>
                <p className="text-[13px] text-ls-secondary mt-xs leading-relaxed">{author.bio}</p>
                {author.expertise.length > 0 && (
                  <div className="flex gap-xs flex-wrap mt-sm">
                    {author.expertise.map((e) => (
                      <span key={e} className="text-[10px] bg-ls-surface text-ls-secondary px-[6px] py-[1px] rounded-full">
                        {e}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AuthorAvatar({ name, avatarURL, size = 36 }: { name: string; avatarURL?: string; size?: number }) {
  if (avatarURL) {
    return (
      <img
        src={avatarURL}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

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

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const htmlLines: string[] = [];

  for (const line of lines) {
    let processed = line;

    // Images: ![alt](url)
    if (/^!\[(.+?)\]\((.+?)\)$/.test(processed)) {
      processed = processed.replace(/^!\[(.+?)\]\((.+?)\)$/, '<img src="$2" alt="$1" class="w-full rounded-card my-md" />');
      htmlLines.push(processed);
      continue;
    }

    processed = processed
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\[(.+?)\]\((\/business\/[^)]+)\)/g, '<a href="$2" class="text-ls-primary font-medium hover:underline">$1</a>')
      .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-ls-primary underline">$1</a>');

    if (/^### (.+)$/.test(processed)) {
      processed = processed.replace(/^### (.+)$/, '<h3 class="text-[20px] font-bold text-ls-primary mt-xl mb-sm">$1</h3>');
    } else if (/^## (.+)$/.test(processed)) {
      processed = processed.replace(/^## (.+)$/, '<h2 class="text-[22px] font-bold text-ls-primary mt-xl mb-sm">$1</h2>');
    } else if (/^# (.+)$/.test(processed)) {
      processed = processed.replace(/^# (.+)$/, '<h1 class="text-[26px] font-bold text-ls-primary mt-xl mb-md">$1</h1>');
    } else if (/^- (.+)$/.test(processed)) {
      processed = processed.replace(/^- (.+)$/, '<li class="ml-lg list-disc">$1</li>');
    } else if (processed.trim() === "") {
      processed = '<div class="h-[16px]"></div>';
    } else {
      processed = `<p class="mb-md">${processed}</p>`;
    }

    htmlLines.push(processed);
  }

  return <div dangerouslySetInnerHTML={{ __html: htmlLines.join("") }} />;
}
