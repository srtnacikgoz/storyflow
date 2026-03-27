import { useState } from "react";
import BeforeAfterSlider from "./BeforeAfterSlider";
import type { EnhancementJob } from "../types";

interface EnhancementGalleryProps {
  jobs: EnhancementJob[];
  onDelete?: (id: string) => void;
}

/**
 * Enhancement sonuç galerisi
 * Tamamlanan işleri grid görünümde gösterir, Before/After modal ile karşılaştırma
 */
export default function EnhancementGallery({ jobs, onDelete }: EnhancementGalleryProps) {
  const [selectedJob, setSelectedJob] = useState<EnhancementJob | null>(null);

  const completedJobs = jobs.filter(j => j.status === "completed" && j.enhancedImageUrl);
  const otherJobs = jobs.filter(j => j.status !== "completed" || !j.enhancedImageUrl);

  if (jobs.length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Tamamlanan işler — galeri grid */}
      {completedJobs.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">
            Tamamlanan İyileştirmeler
            <span className="text-sm font-normal text-gray-400 ml-2">({completedJobs.length})</span>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="group relative rounded-xl overflow-hidden border border-gray-200 cursor-pointer hover:shadow-md transition-shadow bg-gray-50"
                onClick={() => setSelectedJob(job)}
              >
                <img
                  src={job.enhancedImageUrl!}
                  alt={job.analysis?.productType || "İyileştirilmiş"}
                  className="w-full aspect-square object-cover"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                  <div className="w-full p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-xs font-medium capitalize truncate">
                      {job.analysis?.productType || "—"}
                    </p>
                    <p className="text-white/70 text-xs">
                      {new Date(job.createdAt).toLocaleDateString("tr-TR")}
                    </p>
                  </div>
                </div>
                {/* Skor badge */}
                {job.analysis?.compositionScore && (
                  <div className="absolute top-2 right-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                      job.analysis.compositionScore >= 7 ? "bg-emerald-500 text-white" :
                      job.analysis.compositionScore >= 4 ? "bg-amber-500 text-white" :
                      "bg-red-500 text-white"
                    }`}>
                      {job.analysis.compositionScore}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diğer işler (pending, failed, analyzing) — kompakt tablo */}
      {otherJobs.length > 0 && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Devam Eden / Başarısız İşler</h3>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Tarih</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Durum</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Ürün</th>
                  <th className="text-left px-4 py-2 text-gray-500 font-medium">Hata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {otherJobs.slice(0, 10).map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-600">
                      {new Date(job.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        job.status === "failed" ? "bg-red-100 text-red-700" :
                        job.status === "analyzing" ? "bg-blue-100 text-blue-700" :
                        job.status === "processing" ? "bg-amber-100 text-amber-700" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600 capitalize">
                      {job.analysis?.productType || "—"}
                    </td>
                    <td className="px-4 py-2 text-red-500 text-xs truncate max-w-[200px]">
                      {job.error || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Before/After Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 capitalize">
                {selectedJob.analysis?.productType || "İyileştirme Detayı"}
              </h3>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Before/After */}
            <BeforeAfterSlider
              beforeUrl={selectedJob.originalImageUrl}
              afterUrl={selectedJob.enhancedImageUrl!}
            />

            {/* Analiz bilgileri */}
            {selectedJob.analysis && (
              <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 rounded-lg p-3">
                <div>
                  <span className="text-gray-500">Yüzey:</span>
                  <span className="ml-1 text-gray-800">{selectedJob.analysis.surfaceProperties}</span>
                </div>
                <div>
                  <span className="text-gray-500">Skor:</span>
                  <span className="ml-1 font-bold text-gray-800">{selectedJob.analysis.compositionScore}/10</span>
                </div>
                <div>
                  <span className="text-gray-500">Preset:</span>
                  <span className="ml-1 text-gray-800">{selectedJob.selectedPresetId || "—"}</span>
                </div>
                <div>
                  <span className="text-gray-500">Stil:</span>
                  <span className="ml-1 text-gray-800">{selectedJob.selectedStyleId || "—"}</span>
                </div>
              </div>
            )}

            {/* Aksiyonlar */}
            <div className="flex gap-2">
              <a
                href={selectedJob.enhancedImageUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 text-sm font-medium"
              >
                Tam Boyut Aç
              </a>
              {onDelete && (
                <button
                  onClick={() => { onDelete(selectedJob.id); setSelectedJob(null); }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 text-sm"
                >
                  Sil
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
