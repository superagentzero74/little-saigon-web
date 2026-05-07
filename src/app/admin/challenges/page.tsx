"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Loader2,
  Trophy,
  Camera,
  Star,
  Calendar,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Award,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { getDishes } from "@/lib/services";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import type { MonVietDish } from "@/lib/types";

/* ---------- types ---------- */

interface Challenge {
  id: string;
  title: string;
  description: string;
  foodTag: string;
  pointsReward: number;
  winnerPoints: number;
  startDate: Timestamp;
  endDate: Timestamp;
  status: "active" | "ended" | "draft";
  createdAt: Timestamp;
}

interface Submission {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  photoURL: string;
  businessId: string;
  businessName: string;
  createdAt: Timestamp;
  votes: number;
  featured: boolean;
}

/* ---------- helpers ---------- */

const inputClass =
  "bg-white border border-ls-border rounded px-[8px] py-[6px] text-[13px] outline-none focus:border-ls-primary w-full";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  ended: "bg-gray-100 text-gray-600",
  draft: "bg-yellow-100 text-yellow-800",
};

function tsToDate(ts: Timestamp | undefined): string {
  if (!ts) return "";
  const d = ts.toDate();
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function tsToInputValue(ts: Timestamp | undefined): string {
  if (!ts) return "";
  return ts.toDate().toISOString().slice(0, 10);
}

function emptyForm() {
  return {
    title: "",
    description: "",
    foodTag: "",
    pointsReward: 250,
    winnerPoints: 500,
    startDate: "",
    endDate: "",
    status: "draft" as Challenge["status"],
  };
}

/* ---------- component ---------- */

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [msg, setMsg] = useState<{ text: string; err?: boolean } | null>(null);

  // food tag autocomplete
  const [dishes, setDishes] = useState<MonVietDish[]>([]);
  const [foodSuggestions, setFoodSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // expanded challenge (view submissions)
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);

  const flash = (text: string, err = false) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(null), 2500);
  };

  /* --- load challenges --- */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "challenges"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      setChallenges(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Challenge)));
    } catch (err: any) {
      flash(err.message || "Failed to load challenges", true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* --- load dishes for autocomplete --- */
  useEffect(() => {
    getDishes().then(setDishes).catch(() => {});
  }, []);

  /* --- food tag autocomplete --- */
  const handleFoodTagChange = (val: string) => {
    setForm((f) => ({ ...f, foodTag: val }));
    if (val.trim().length > 0) {
      const lower = val.toLowerCase();
      const matches = dishes
        .filter(
          (d) =>
            d.name.toLowerCase().includes(lower) ||
            d.englishName.toLowerCase().includes(lower)
        )
        .slice(0, 8)
        .map((d) => `${d.name} (${d.englishName})`);
      setFoodSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectFoodTag = (tag: string) => {
    // extract the Vietnamese name before the parenthesis
    const name = tag.split(" (")[0];
    setForm((f) => ({ ...f, foodTag: name }));
    setShowSuggestions(false);
  };

  /* --- create challenge --- */
  const handleCreate = async () => {
    if (!form.title.trim() || !form.foodTag.trim() || !form.startDate || !form.endDate) {
      flash("Title, food tag, start date, and end date are required.", true);
      return;
    }
    setSaving(true);
    try {
      await addDoc(collection(db, "challenges"), {
        title: form.title.trim(),
        description: form.description.trim(),
        foodTag: form.foodTag.trim(),
        pointsReward: form.pointsReward,
        winnerPoints: form.winnerPoints,
        startDate: Timestamp.fromDate(new Date(form.startDate)),
        endDate: Timestamp.fromDate(new Date(form.endDate)),
        status: form.status,
        createdAt: serverTimestamp(),
      });
      flash("Challenge created!");
      setCreating(false);
      setForm(emptyForm());
      load();
    } catch (err: any) {
      flash(err.message || "Error creating challenge", true);
    } finally {
      setSaving(false);
    }
  };

  /* --- end challenge --- */
  const endChallenge = async (id: string) => {
    try {
      await updateDoc(doc(db, "challenges", id), { status: "ended" });
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "ended" as const } : c))
      );
      flash("Challenge ended.");
    } catch (err: any) {
      flash(err.message || "Error", true);
    }
  };

  /* --- activate challenge --- */
  const activateChallenge = async (id: string) => {
    try {
      await updateDoc(doc(db, "challenges", id), { status: "active" });
      setChallenges((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: "active" as const } : c))
      );
      flash("Challenge activated.");
    } catch (err: any) {
      flash(err.message || "Error", true);
    }
  };

  /* --- load submissions --- */
  const loadSubmissions = async (challengeId: string) => {
    if (expandedId === challengeId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(challengeId);
    setSubsLoading(true);
    try {
      const q = query(
        collection(db, "challenges", challengeId, "submissions"),
        orderBy("votes", "desc")
      );
      const snap = await getDocs(q);
      setSubmissions(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Submission)));
    } catch (err: any) {
      flash(err.message || "Error loading submissions", true);
    } finally {
      setSubsLoading(false);
    }
  };

  /* --- toggle featured --- */
  const toggleFeatured = async (challengeId: string, subId: string, current: boolean) => {
    try {
      await updateDoc(doc(db, "challenges", challengeId, "submissions", subId), {
        featured: !current,
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === subId ? { ...s, featured: !current } : s))
      );
      flash(!current ? "Marked as winner!" : "Unfeatured.");
    } catch (err: any) {
      flash(err.message || "Error", true);
    }
  };

  /* ---------- render ---------- */
  return (
    <div className="p-2xl space-y-[16px]">
      {/* header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-ls-primary flex items-center gap-[8px]">
            <Camera className="w-[20px] h-[20px]" />
            Food Photo Challenges
          </h1>
          <p className="text-[13px] text-ls-secondary mt-[2px]">
            Manage photo challenges and pick winners
          </p>
        </div>
        <button
          onClick={() => {
            setForm(emptyForm());
            setCreating((v) => !v);
          }}
          className="ls-btn flex items-center gap-[4px] text-[13px]"
        >
          {creating ? <X className="w-[14px] h-[14px]" /> : <Plus className="w-[14px] h-[14px]" />}
          {creating ? "Cancel" : "New Challenge"}
        </button>
      </div>

      {/* flash message */}
      {msg && (
        <div
          className={`rounded-btn px-[12px] py-[8px] text-[13px] ${
            msg.err ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* create form */}
      {creating && (
        <div className="ls-card p-[16px] space-y-[12px]">
          <h2 className="text-[15px] font-semibold text-ls-primary">Create Challenge</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
            <div>
              <label className="text-[12px] text-ls-secondary block mb-[4px]">Title *</label>
              <input
                className={inputClass}
                placeholder="Best Banh Mi Photo"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div className="relative">
              <label className="text-[12px] text-ls-secondary block mb-[4px]">Food Tag *</label>
              <input
                className={inputClass}
                placeholder="Search Mon Viet dishes..."
                value={form.foodTag}
                onChange={(e) => handleFoodTagChange(e.target.value)}
                onFocus={() => form.foodTag.trim() && foodSuggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              />
              {showSuggestions && (
                <div className="absolute z-10 top-full left-0 right-0 bg-white border border-ls-border rounded shadow-md max-h-[200px] overflow-y-auto">
                  {foodSuggestions.map((s) => (
                    <button
                      key={s}
                      className="block w-full text-left px-[8px] py-[6px] text-[13px] hover:bg-ls-surface"
                      onMouseDown={() => selectFoodTag(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-[12px] text-ls-secondary block mb-[4px]">Description</label>
            <textarea
              className={inputClass + " h-[60px] resize-none"}
              placeholder="Show us your best photo..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
            <div>
              <label className="text-[12px] text-ls-secondary block mb-[4px]">Points Reward</label>
              <input
                type="number"
                className={inputClass}
                value={form.pointsReward}
                onChange={(e) => setForm((f) => ({ ...f, pointsReward: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-[12px] text-ls-secondary block mb-[4px]">Winner Bonus</label>
              <input
                type="number"
                className={inputClass}
                value={form.winnerPoints}
                onChange={(e) => setForm((f) => ({ ...f, winnerPoints: Number(e.target.value) }))}
              />
            </div>
            <div>
              <label className="text-[12px] text-ls-secondary block mb-[4px]">Start Date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-[12px] text-ls-secondary block mb-[4px]">End Date *</label>
              <input
                type="date"
                className={inputClass}
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <label className="text-[12px] text-ls-secondary block mb-[4px]">Status</label>
            <select
              className={inputClass + " w-auto"}
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Challenge["status"] }))}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={saving}
              className="ls-btn flex items-center gap-[4px] text-[13px]"
            >
              {saving ? <Loader2 className="w-[14px] h-[14px] animate-spin" /> : <Check className="w-[14px] h-[14px]" />}
              Create Challenge
            </button>
          </div>
        </div>
      )}

      {/* challenges list */}
      {loading ? (
        <div className="flex justify-center py-[40px]">
          <Loader2 className="w-[24px] h-[24px] animate-spin text-ls-secondary" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-[40px] text-[14px] text-ls-secondary">
          No challenges yet. Create your first one!
        </div>
      ) : (
        <div className="space-y-[12px]">
          {challenges.map((ch) => (
            <div key={ch.id} className="ls-card overflow-hidden">
              {/* challenge row */}
              <div className="p-[16px] flex items-start justify-between gap-[12px]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <h3 className="text-[15px] font-semibold text-ls-primary">{ch.title}</h3>
                    <span
                      className={`text-[11px] px-[8px] py-[2px] rounded-full font-medium ${
                        STATUS_COLORS[ch.status] || STATUS_COLORS.draft
                      }`}
                    >
                      {ch.status}
                    </span>
                  </div>

                  {ch.description && (
                    <p className="text-[13px] text-ls-secondary mt-[4px] line-clamp-2">
                      {ch.description}
                    </p>
                  )}

                  <div className="flex items-center gap-[12px] mt-[8px] text-[12px] text-ls-secondary flex-wrap">
                    <span className="flex items-center gap-[4px]">
                      <Tag className="w-[12px] h-[12px]" />
                      {ch.foodTag}
                    </span>
                    <span className="flex items-center gap-[4px]">
                      <Star className="w-[12px] h-[12px]" />
                      {ch.pointsReward} pts / {ch.winnerPoints} winner
                    </span>
                    <span className="flex items-center gap-[4px]">
                      <Calendar className="w-[12px] h-[12px]" />
                      {tsToDate(ch.startDate)} &ndash; {tsToDate(ch.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-[6px] shrink-0">
                  {ch.status === "draft" && (
                    <button
                      onClick={() => activateChallenge(ch.id)}
                      className="ls-btn text-[12px] px-[10px] py-[4px] flex items-center gap-[4px]"
                    >
                      <Check className="w-[12px] h-[12px]" /> Activate
                    </button>
                  )}
                  {ch.status === "active" && (
                    <button
                      onClick={() => endChallenge(ch.id)}
                      className="text-[12px] px-[10px] py-[4px] rounded-btn border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-[4px]"
                    >
                      <X className="w-[12px] h-[12px]" /> End
                    </button>
                  )}
                  <button
                    onClick={() => loadSubmissions(ch.id)}
                    className="text-[12px] px-[10px] py-[4px] rounded-btn border border-ls-border text-ls-secondary hover:bg-ls-surface flex items-center gap-[4px]"
                  >
                    <Camera className="w-[12px] h-[12px]" />
                    Submissions
                    {expandedId === ch.id ? (
                      <ChevronUp className="w-[12px] h-[12px]" />
                    ) : (
                      <ChevronDown className="w-[12px] h-[12px]" />
                    )}
                  </button>
                </div>
              </div>

              {/* submissions panel */}
              {expandedId === ch.id && (
                <div className="border-t border-ls-border bg-ls-surface p-[16px]">
                  {subsLoading ? (
                    <div className="flex justify-center py-[20px]">
                      <Loader2 className="w-[20px] h-[20px] animate-spin text-ls-secondary" />
                    </div>
                  ) : submissions.length === 0 ? (
                    <p className="text-[13px] text-ls-secondary text-center py-[16px]">
                      No submissions yet.
                    </p>
                  ) : (
                    <div>
                      <p className="text-[12px] text-ls-secondary mb-[12px]">
                        {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-[12px]">
                        {submissions.map((sub) => (
                          <div
                            key={sub.id}
                            className={`relative rounded-card overflow-hidden border-2 ${
                              sub.featured ? "border-yellow-400" : "border-ls-border"
                            } bg-white`}
                          >
                            {/* photo */}
                            <div className="aspect-square bg-gray-100 relative">
                              {sub.photoURL ? (
                                <img
                                  src={sub.photoURL}
                                  alt="Submission"
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full text-ls-secondary">
                                  <Camera className="w-[24px] h-[24px]" />
                                </div>
                              )}
                              {sub.featured && (
                                <div className="absolute top-[4px] left-[4px] bg-yellow-400 text-yellow-900 rounded-full p-[4px]">
                                  <Trophy className="w-[12px] h-[12px]" />
                                </div>
                              )}
                            </div>

                            {/* info */}
                            <div className="p-[8px]">
                              <p className="text-[12px] font-medium text-ls-primary truncate">
                                {sub.userName || "Anonymous"}
                              </p>
                              <p className="text-[11px] text-ls-secondary truncate">
                                {sub.businessName || ""}
                              </p>
                              <div className="flex items-center justify-between mt-[6px]">
                                <span className="text-[11px] text-ls-secondary">
                                  {sub.votes} vote{sub.votes !== 1 ? "s" : ""}
                                </span>
                                <button
                                  onClick={() => toggleFeatured(ch.id, sub.id, sub.featured)}
                                  className={`text-[11px] px-[6px] py-[2px] rounded-btn flex items-center gap-[2px] ${
                                    sub.featured
                                      ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                  }`}
                                >
                                  <Award className="w-[10px] h-[10px]" />
                                  {sub.featured ? "Winner" : "Feature"}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* small inline icon used in meta row */
function Tag({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H2v10l9.29 9.29a1 1 0 001.42 0l6.58-6.58a1 1 0 000-1.42L12 2z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </svg>
  );
}
