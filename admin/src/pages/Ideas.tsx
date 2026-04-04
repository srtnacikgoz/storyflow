import { useEffect, useState, useRef } from "react";
import { api } from "../services/api";

interface Idea {
  id: string;
  title: string;
  text: string;
  category: string;
  createdAt: number;
  done: boolean;
}

const CATEGORIES = [
  { id: "gorsel", label: "Gorsel Uretimi", color: "bg-amber-100 text-amber-800" },
  { id: "senaryo", label: "Senaryo", color: "bg-blue-100 text-blue-800" },
  { id: "ozellik", label: "Ozellik", color: "bg-emerald-100 text-emerald-800" },
  { id: "hata", label: "Hata / Sorun", color: "bg-red-100 text-red-800" },
  { id: "genel", label: "Genel", color: "bg-gray-100 text-gray-700" },
];

export default function Ideas() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [category, setCategory] = useState("genel");
  const [saving, setSaving] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState("genel");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    loadIdeas();
  }, []);

  const loadIdeas = async () => {
    setLoading(true);
    try {
      const result = await api.get<{ success: boolean; data: Idea[] }>("listIdeas");
      setIdeas(result.data || []);
    } catch {
      setIdeas([]);
    } finally {
      setLoading(false);
    }
  };

  // Fikir kaydet — optimistic
  const saveIdea = async () => {
    const trimmedText = text.trim();
    const trimmedTitle = title.trim();
    if (!trimmedText) return;

    setSaving(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticIdea: Idea = {
      id: tempId,
      title: trimmedTitle,
      text: trimmedText,
      category,
      createdAt: Date.now(),
      done: false,
    };

    setIdeas(prev => [optimisticIdea, ...prev]);
    setTitle("");
    setText("");
    setSaving(false);

    try {
      const result = await api.post<{ success: boolean; data: Idea }>("createIdea", {
        title: trimmedTitle,
        text: trimmedText,
        category,
      });
      if (result.data?.id) {
        setIdeas(prev => prev.map(i => i.id === tempId ? { ...i, id: result.data.id } : i));
      }
    } catch (err) {
      console.error("Fikir kaydedilemedi:", err);
      setIdeas(prev => prev.filter(i => i.id !== tempId));
    }
  };

  // Fikir tamamla/geri al
  const toggleDone = async (id: string, done: boolean) => {
    setIdeas(prev => prev.map(i => i.id === id ? { ...i, done: !done } : i));
    try {
      await api.post("updateIdea", { id, done: !done });
    } catch (err) {
      console.error("Fikir guncellenemedi:", err);
      setIdeas(prev => prev.map(i => i.id === id ? { ...i, done } : i));
    }
  };

  // Fikir sil
  const deleteIdea = async (id: string) => {
    const backup = ideas;
    setIdeas(prev => prev.filter(i => i.id !== id));
    try {
      await api.post("deleteIdea", { id });
    } catch (err) {
      console.error("Fikir silinemedi:", err);
      setIdeas(backup);
    }
  };

  // Fikir kopyala
  const copyIdea = async (idea: Idea) => {
    const copyText = idea.title
      ? `${idea.title}\n\n${idea.text}`
      : idea.text;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopiedId(idea.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = copyText;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedId(idea.id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  };

  // Düzenleme başlat
  const startEdit = (idea: Idea) => {
    setEditingId(idea.id);
    setEditTitle(idea.title || "");
    setEditText(idea.text);
    setEditCategory(idea.category);
  };

  // Düzenleme kaydet
  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return;

    const updates = {
      title: editTitle.trim(),
      text: editText.trim(),
      category: editCategory,
    };

    setIdeas(prev => prev.map(i => i.id === editingId ? { ...i, ...updates } : i));
    const savedEditingId = editingId;
    setEditingId(null);

    try {
      await api.post("updateIdea", { id: savedEditingId, ...updates });
    } catch (err) {
      console.error("Fikir guncellenemedi:", err);
      loadIdeas();
    }
  };

  // Mikrofon — Web Speech API
  const toggleMicrophone = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Tarayiciniz ses tanima desteklemiyor. Chrome kullanin.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "tr-TR";
    recognition.continuous = true;
    recognition.interimResults = true;

    let finalTranscript = text;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
          setText(finalTranscript);
        } else {
          interim = transcript;
        }
      }
      if (interim) {
        setText(finalTranscript + (finalTranscript ? " " : "") + interim);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    textareaRef.current?.focus();
  };

  // Enter ile kaydet (Shift+Enter yeni satır)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      saveIdea();
    }
  };

  // Filtreleme
  const filteredIdeas = ideas.filter(i => {
    if (filter === "all") return true;
    if (filter === "done") return i.done;
    if (filter === "active") return !i.done;
    return i.category === filter;
  });

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getCategoryInfo = (id: string) => CATEGORIES.find(c => c.id === id) || CATEGORIES[4];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Fikir Defteri</h1>
        <p className="text-sm text-gray-500 mt-1">Fikirlerini hizlica not et — mikrofon ile dikte edebilirsin</p>
      </div>

      {/* Yeni fikir girisi */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        {/* Başlık input */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Başlık (opsiyonel)"
          className="w-full border border-gray-200 rounded-lg px-4 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-amber-200"
        />

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Fikrini yaz veya mikrofona tikla..."
            rows={3}
            className={`w-full border rounded-lg px-4 py-3 pr-14 text-sm resize-y min-h-[80px] focus:outline-none focus:ring-2 transition-colors ${
              isListening
                ? "border-red-300 focus:ring-red-200 bg-red-50/30"
                : "border-gray-200 focus:ring-amber-200"
            }`}
          />
          {/* Mikrofon butonu */}
          <button
            onClick={toggleMicrophone}
            className={`absolute right-3 top-3 p-2 rounded-full transition-all ${
              isListening
                ? "bg-red-500 text-white animate-pulse shadow-lg"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            title={isListening ? "Dinlemeyi durdur" : "Sesle dikte et"}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          {isListening && (
            <div className="absolute left-4 bottom-3 text-xs text-red-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Dinleniyor...
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-3">
          {/* Kategori secimi */}
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`text-xs px-2.5 py-1 rounded-full transition-all ${
                  category === cat.id
                    ? cat.color + " font-semibold ring-1 ring-current/20"
                    : "bg-gray-50 text-gray-400 hover:bg-gray-100"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Kaydet butonu */}
          <button
            onClick={saveIdea}
            disabled={!text.trim() || saving}
            className="btn-primary text-sm px-4 py-1.5 disabled:opacity-40"
          >
            {saving ? "..." : "Kaydet"}
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[
          { id: "all", label: "Tumu" },
          { id: "active", label: "Aktif" },
          { id: "done", label: "Tamamlanan" },
          ...CATEGORIES,
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1 rounded-full transition-all ${
              filter === f.id
                ? "bg-gray-800 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {f.label}
            {f.id === "all" && ` (${ideas.length})`}
            {f.id === "active" && ` (${ideas.filter(i => !i.done).length})`}
          </button>
        ))}
      </div>

      {/* Fikir listesi */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Yukleniyor...</div>
      ) : filteredIdeas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">💡</div>
          <p className="text-gray-400 text-sm">
            {filter === "all" ? "Henuz fikir yok. Yukaridaki alana yazarak baslayabilirsin." : "Bu filtreye uygun fikir yok."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredIdeas.map(idea => {
            const catInfo = getCategoryInfo(idea.category);
            const isEditing = editingId === idea.id;

            return (
              <div
                key={idea.id}
                className={`bg-white rounded-lg border border-gray-100 p-3 transition-all ${
                  idea.done ? "opacity-50" : ""
                }`}
              >
                {isEditing ? (
                  /* Düzenleme modu */
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Başlık"
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200"
                      autoFocus
                    />
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setEditCategory(cat.id)}
                            className={`text-[10px] px-2 py-0.5 rounded-full transition-all ${
                              editCategory === cat.id
                                ? cat.color + " font-semibold"
                                : "bg-gray-50 text-gray-400"
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1"
                        >
                          İptal
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={!editText.trim()}
                          className="text-xs bg-amber-600 text-white px-3 py-1 rounded-lg hover:bg-amber-700 disabled:opacity-40"
                        >
                          Kaydet
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Görüntüleme modu */
                  <div className="flex items-start gap-3 group">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleDone(idea.id, idea.done)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                        idea.done
                          ? "bg-emerald-500 border-emerald-500 text-white"
                          : "border-gray-300 hover:border-emerald-400"
                      }`}
                    >
                      {idea.done && (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>

                    {/* İçerik */}
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
                    >
                      {/* Başlık */}
                      {idea.title && (
                        <p className={`text-sm font-semibold mb-0.5 ${idea.done ? "line-through text-gray-400" : "text-gray-900"}`}>
                          {idea.title}
                        </p>
                      )}
                      {/* Metin */}
                      <p className={`text-sm whitespace-pre-wrap break-words ${idea.done ? "line-through text-gray-400" : "text-gray-600"} ${expandedId === idea.id ? "" : "line-clamp-2"}`}>
                        {idea.text}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${catInfo.color}`}>
                          {catInfo.label}
                        </span>
                        <span className="text-[10px] text-gray-300">
                          {new Date(idea.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Aksiyon butonları */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {/* Kopyala */}
                      <button
                        onClick={() => copyIdea(idea)}
                        className="text-gray-300 hover:text-blue-500 transition-all p-1"
                        title="Kopyala"
                      >
                        {copiedId === idea.id ? (
                          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                      {/* Düzenle */}
                      <button
                        onClick={() => startEdit(idea)}
                        className="text-gray-300 hover:text-amber-500 transition-all p-1"
                        title="Düzenle"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {/* Sil */}
                      <button
                        onClick={() => deleteIdea(idea.id)}
                        className="text-gray-300 hover:text-red-400 transition-all p-1"
                        title="Sil"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
