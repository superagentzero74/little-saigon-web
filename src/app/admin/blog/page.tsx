"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Pencil, Trash2, Search, Loader2, Upload, X, Eye, EyeOff } from "lucide-react";
import { getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost, uploadBlogImage } from "@/lib/services";
import type { BlogPost } from "@/lib/types";
import { serverTimestamp } from "firebase/firestore";

const inputClass =
  "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary w-full";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const fileRef = useRef<HTMLInputElement>(null);

  function emptyForm() {
    return {
      title: "",
      slug: "",
      body: "",
      excerpt: "",
      coverImageURL: "",
      images: [] as string[],
      author: "Little Saigon",
      tags: [] as string[],
      tagInput: "",
      status: "published" as BlogPost["status"],
    };
  }

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const all = await getBlogPosts();
    setPosts(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = posts.filter(
    (p) => !filter || p.title.toLowerCase().includes(filter.toLowerCase())
  );

  const startCreate = () => {
    setForm(emptyForm());
    setCreating(true);
    setEditing(null);
    setPreview(false);
  };

  const startEdit = (post: BlogPost) => {
    setForm({
      title: post.title,
      slug: post.slug,
      body: post.body,
      excerpt: post.excerpt || "",
      coverImageURL: post.coverImageURL || "",
      images: post.images || [],
      author: post.author || "Little Saigon",
      tags: post.tags || [],
      tagInput: "",
      status: post.status,
    });
    setEditing(post.id);
    setCreating(false);
    setPreview(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { flash("Title is required", true); return; }
    if (!form.body.trim()) { flash("Body is required", true); return; }
    setSaving(true);
    try {
      const slug = form.slug || slugify(form.title);
      const data: any = {
        title: form.title.trim(),
        slug,
        body: form.body,
        excerpt: form.excerpt.trim() || form.body.slice(0, 160).trim(),
        coverImageURL: form.coverImageURL || (form.images.length > 0 ? form.images[0] : ""),
        images: form.images,
        author: form.author.trim(),
        tags: form.tags,
        status: form.status,
      };
      if (form.status === "published") {
        data.publishedAt = serverTimestamp();
      }
      if (editing) {
        await updateBlogPost(editing, data);
        flash("Post updated");
      } else {
        await createBlogPost(data);
        flash("Post created");
      }
      setCreating(false);
      setEditing(null);
      await load();
    } catch (e: any) {
      const msg = e.message || "Save failed";
      flash(msg.includes("permission") ? "Permission denied — check Firestore rules and admin role" : msg, true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    await deleteBlogPost(id);
    flash("Post deleted");
    await load();
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const postId = editing || "new_" + Date.now();
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadBlogImage(postId, file);
        urls.push(url);
      }
      setForm((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
      flash(`${urls.length} image(s) uploaded`);
    } catch (e: any) {
      flash("Upload failed: " + (e.message || ""), true);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      coverImageURL: prev.coverImageURL === prev.images[idx] ? "" : prev.coverImageURL,
    }));
  };

  const addTag = () => {
    const tag = form.tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm((prev) => ({ ...prev, tags: [...prev.tags, tag], tagInput: "" }));
    }
  };

  const removeTag = (tag: string) => {
    setForm((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const isEditing = creating || editing;

  return (
    <div className="p-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-lg">
        <div>
          <h1 className="text-page-title text-ls-primary">Blog</h1>
          <p className="text-meta text-ls-secondary">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
        </div>
        {!isEditing && (
          <button onClick={startCreate} className="ls-btn flex items-center gap-xs text-[13px]">
            <Plus size={14} /> New Post
          </button>
        )}
      </div>

      {msg && (
        <div className={`mb-md px-md py-sm rounded text-[13px] ${msg.err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {msg.text}
        </div>
      )}

      {/* Editor */}
      {isEditing && (
        <div className="ls-card p-lg mb-xl">
          <div className="flex items-center justify-between mb-md">
            <h2 className="text-card-title text-ls-primary">{editing ? "Edit Post" : "New Post"}</h2>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="text-ls-secondary hover:text-ls-primary">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Title</label>
              <input
                className={inputClass}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value, slug: slugify(e.target.value) })}
                placeholder="Post title"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Slug</label>
              <input
                className={inputClass}
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="url-friendly-slug"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-md">
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Author</label>
              <input
                className={inputClass}
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Status</label>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as BlogPost["status"] })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="mb-md">
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Excerpt</label>
            <input
              className={inputClass}
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Short preview (auto-generated from body if empty)"
            />
          </div>

          {/* Body with preview toggle */}
          <div className="mb-md">
            <div className="flex items-center justify-between mb-[2px]">
              <label className="text-[11px] font-semibold text-ls-secondary uppercase">Body (Markdown)</label>
              <button
                onClick={() => setPreview(!preview)}
                className="flex items-center gap-[4px] text-[11px] text-ls-secondary hover:text-ls-primary"
              >
                {preview ? <EyeOff size={12} /> : <Eye size={12} />}
                {preview ? "Edit" : "Preview"}
              </button>
            </div>
            {preview ? (
              <div className="bg-white border border-ls-border rounded p-md text-[13px] min-h-[200px] prose prose-sm max-w-none">
                <MarkdownPreview content={form.body} />
              </div>
            ) : (
              <textarea
                className={`${inputClass} min-h-[200px] font-mono`}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Write your post in Markdown..."
              />
            )}
          </div>

          {/* Tags */}
          <div className="mb-md">
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[2px] block">Tags</label>
            <div className="flex gap-xs flex-wrap mb-xs">
              {form.tags.map((tag) => (
                <span key={tag} className="bg-ls-surface text-ls-primary text-[11px] px-[8px] py-[2px] rounded-full flex items-center gap-[4px]">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-ls-secondary hover:text-red-500">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-xs">
              <input
                className={inputClass + " max-w-[200px]"}
                value={form.tagInput}
                onChange={(e) => setForm({ ...form, tagInput: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                placeholder="Add tag..."
              />
              <button onClick={addTag} className="text-[12px] text-ls-primary font-medium">Add</button>
            </div>
          </div>

          {/* Images */}
          <div className="mb-md">
            <label className="text-[11px] font-semibold text-ls-secondary uppercase mb-[4px] block">Images</label>
            <div className="flex gap-sm flex-wrap mb-sm">
              {form.images.map((url, idx) => (
                <div key={idx} className="relative w-[100px] h-[100px] rounded overflow-hidden group">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={10} />
                  </button>
                  {form.coverImageURL === url && (
                    <div className="absolute bottom-0 left-0 right-0 bg-ls-primary text-white text-[9px] text-center py-[1px]">Cover</div>
                  )}
                  {form.coverImageURL !== url && (
                    <button
                      onClick={() => setForm({ ...form, coverImageURL: url })}
                      className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] text-center py-[1px] opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set Cover
                    </button>
                  )}
                </div>
              ))}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e.target.files)}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-xs text-[12px] text-ls-primary font-medium"
            >
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading..." : "Upload Images"}
            </button>
          </div>

          <div className="flex gap-sm">
            <button onClick={handleSave} disabled={saving} className="ls-btn text-[13px] flex items-center gap-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              {editing ? "Update" : "Create"} Post
            </button>
            <button onClick={() => { setCreating(false); setEditing(null); }} className="text-[13px] text-ls-secondary hover:text-ls-primary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      {!isEditing && (
        <div className="relative mb-md">
          <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-ls-secondary" />
          <input
            className={inputClass + " pl-[30px] max-w-sm"}
            placeholder="Search posts..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      )}

      {/* Posts list */}
      {!isEditing && (
        loading ? (
          <div className="flex justify-center py-xl"><Loader2 className="animate-spin text-ls-secondary" /></div>
        ) : filtered.length === 0 ? (
          <p className="text-[13px] text-ls-secondary py-xl text-center">No posts found</p>
        ) : (
          <div className="space-y-sm">
            {filtered.map((post) => (
              <div key={post.id} className="ls-card p-md flex items-start gap-md">
                {post.coverImageURL && (
                  <img src={post.coverImageURL} alt="" className="w-[80px] h-[60px] object-cover rounded flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm mb-[2px]">
                    <h3 className="text-[14px] font-semibold text-ls-primary truncate">{post.title}</h3>
                    <span className={`text-[10px] px-[6px] py-[1px] rounded-full font-medium ${
                      post.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {post.status}
                    </span>
                  </div>
                  <p className="text-[12px] text-ls-secondary truncate">{post.excerpt || post.body.slice(0, 100)}</p>
                  <div className="flex items-center gap-sm mt-[4px]">
                    <span className="text-[11px] text-ls-secondary">{post.author}</span>
                    {post.tags.length > 0 && (
                      <span className="text-[11px] text-ls-secondary">
                        {post.tags.map((t) => `#${t}`).join(" ")}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-xs flex-shrink-0">
                  <button onClick={() => startEdit(post)} className="text-ls-secondary hover:text-ls-primary">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(post.id)} className="text-ls-secondary hover:text-red-500">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// Simple markdown preview
function MarkdownPreview({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" class="text-ls-primary underline">$1</a>')
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*<\/li>)/, "<ul>$1</ul>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>");
  return <div dangerouslySetInnerHTML={{ __html: `<p>${html}</p>` }} />;
}
