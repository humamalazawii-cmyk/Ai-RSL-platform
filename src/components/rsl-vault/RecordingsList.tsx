"use client";

import { useState, useTransition } from "react";

// Types matching API responses
type Recording = {
  driveFileId: string;
  name: string;
  mimeType: string;
  sizeMB: number;
  modifiedTime: string;
  webViewLink: string | null;
  meeting: {
    id: string;
    status: string;
    title: string;
    ideasCount: number;
    createdAt: string;
  } | null;
};

type ProcessedIdea = {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  feasible: boolean;
  feasibilityReasoning: string;
  estimatedDays: number | null;
  estimatedMonthlyCost: number;
  proposedMonth: string | null;
  status: string;
};

type IdeasState = {
  meetingId: string;
  ideas: ProcessedIdea[];
} | null;

export default function RecordingsList() {
  const [recordings, setRecordings] = useState<Recording[] | null>(null);
  const [scanning, startScan] = useTransition();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownIdeas, setShownIdeas] = useState<IdeasState>(null);

  async function handleScan() {
    setError(null);
    startScan(async () => {
      try {
        const res = await fetch("/api/rsl-vault/scan");
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Scan failed");
          return;
        }
        setRecordings(data.recordings);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Network error");
      }
    });
  }

  async function handleProcess(rec: Recording) {
    setProcessingId(rec.driveFileId);
    setError(null);
    setShownIdeas(null);
    try {
      const res = await fetch("/api/rsl-vault/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          driveFileId: rec.driveFileId,
          name: rec.name,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          `${data.error ?? "Processing failed"}${data.stage ? ` (stage: ${data.stage})` : ""}`
        );
        setProcessingId(null);
        return;
      }
      // Fetch full ideas details
      const ideasRes = await fetch(
        `/api/rsl-vault/ideas?meetingId=${data.meetingId}`
      );
      if (ideasRes.ok) {
        const ideasData = await ideasRes.json();
        setShownIdeas({
          meetingId: data.meetingId,
          ideas: ideasData.ideas,
        });
      }
      // Refresh the list
      await handleScan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleViewIdeas(meetingId: string) {
    setError(null);
    try {
      const res = await fetch(`/api/rsl-vault/ideas?meetingId=${meetingId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load ideas");
        return;
      }
      setShownIdeas({ meetingId, ideas: data.ideas });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    }
  }

  function statusBadge(status: string | undefined) {
    if (!status) {
      return (
        <span className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300">
          جديد
        </span>
      );
    }
    const colors: Record<string, string> = {
      UPLOADED: "bg-slate-700 text-slate-300",
      TRANSCRIBING: "bg-blue-900/50 text-blue-300",
      ANALYZING: "bg-purple-900/50 text-purple-300",
      READY: "bg-emerald-900/50 text-emerald-300",
      FAILED: "bg-red-900/50 text-red-300",
    };
    const labels: Record<string, string> = {
      UPLOADED: "مرفوع",
      TRANSCRIBING: "يُفرَّغ...",
      ANALYZING: "يُحلَّل...",
      READY: "✓ جاهز",
      FAILED: "فشل",
    };
    return (
      <span
        className={`rounded px-2 py-1 text-xs ${colors[status] ?? "bg-slate-700 text-slate-300"}`}
      >
        {labels[status] ?? status}
      </span>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-100">
          التسجيلات في Drive
        </h2>
        <button
          onClick={handleScan}
          disabled={scanning}
          className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {scanning ? "جاري البحث..." : "🔍 بحث عن تسجيلات"}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-700/50 bg-red-900/20 p-3 text-sm text-red-300">
          ⚠️ {error}
        </div>
      )}

      {recordings === null && !scanning && (
        <p className="text-center text-slate-400 py-8">
          اضغط الزر أعلاه للبحث عن التسجيلات في Google Drive
        </p>
      )}

      {recordings !== null && recordings.length === 0 && (
        <p className="text-center text-slate-400 py-8">
          لم نجد أي تسجيلات صوتية أو فيديو في Drive
        </p>
      )}

      {recordings !== null && recordings.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-slate-800 text-sm text-slate-400">
                <th className="pb-3 font-medium">الملف</th>
                <th className="pb-3 font-medium">الحجم</th>
                <th className="pb-3 font-medium">التاريخ</th>
                <th className="pb-3 font-medium">الحالة</th>
                <th className="pb-3 font-medium">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {recordings.map((rec) => {
                const isProcessing = processingId === rec.driveFileId;
                const status = rec.meeting?.status;
                return (
                  <tr
                    key={rec.driveFileId}
                    className="border-b border-slate-800/50"
                  >
                    <td className="py-3 text-slate-200">
                      <div className="font-medium">{rec.name}</div>
                      <div className="text-xs text-slate-500">
                        {rec.mimeType}
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">{rec.sizeMB} MB</td>
                    <td className="py-3 text-sm text-slate-400">
                      {new Date(rec.modifiedTime).toLocaleDateString("ar-IQ")}
                    </td>
                    <td className="py-3">{statusBadge(status)}</td>
                    <td className="py-3">
                      {status === "READY" ? (
                        <button
                          onClick={() =>
                            rec.meeting && handleViewIdeas(rec.meeting.id)
                          }
                          className="rounded bg-slate-700 px-3 py-1 text-sm text-slate-200 hover:bg-slate-600"
                        >
                          👁 عرض ({rec.meeting?.ideasCount} فكرة)
                        </button>
                      ) : isProcessing ? (
                        <span className="text-sm text-purple-300">
                          جاري المعالجة... (1-3 دقائق)
                        </span>
                      ) : (
                        <button
                          onClick={() => handleProcess(rec)}
                          disabled={processingId !== null}
                          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          ⚡ تحليل
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Ideas display */}
      {shownIdeas && (
        <div className="mt-8 rounded-lg border border-emerald-700/30 bg-emerald-950/20 p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-xl font-bold text-emerald-300">
              💡 الأفكار المستخرجة ({shownIdeas.ideas.length})
            </h3>
            <button
              onClick={() => setShownIdeas(null)}
              className="text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          </div>
          <div className="space-y-4">
            {shownIdeas.ideas.map((idea) => (
              <div
                key={idea.id}
                className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h4 className="text-lg font-bold text-slate-100">
                    {idea.title}
                  </h4>
                  <span
                    className={`shrink-0 rounded px-2 py-1 text-xs ${
                      idea.feasible
                        ? "bg-emerald-900/50 text-emerald-300"
                        : "bg-red-900/50 text-red-300"
                    }`}
                  >
                    {idea.feasible ? "✓ ممكن" : "✗ غير ممكن"}
                  </span>
                </div>
                <p className="mb-3 text-sm text-slate-300">
                  {idea.description}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-xs text-slate-500">الفئة</div>
                    <div className="text-slate-200">{idea.category}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">الأولوية</div>
                    <div className="text-slate-200">{idea.priority}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">أيام التطوير</div>
                    <div className="text-slate-200">
                      {idea.estimatedDays ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">تكلفة شهرية</div>
                    <div className="text-slate-200">
                      ${idea.estimatedMonthlyCost}
                    </div>
                  </div>
                </div>
                <div className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">
                  <strong>تحليل الجدوى:</strong> {idea.feasibilityReasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
