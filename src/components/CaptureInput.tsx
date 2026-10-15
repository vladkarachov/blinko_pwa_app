import React, { useState, useRef, useEffect } from 'react';
import { Zap, FileText, CheckSquare, Hash, Mic, MicOff, Send, Sparkles } from 'lucide-react';
import { NoteType } from '../types';

interface CaptureInputProps {
  onSave: (content: string, type: NoteType) => Promise<void>;
  existingTags: string[];
}

export const CaptureInput: React.FC<CaptureInputProps> = ({ onSave, existingTags }) => {
  const [content, setContent] = useState('');
  const [noteType, setNoteType] = useState<NoteType>(0); // 0 = Blinko, 1 = Note
  const [isSaving, setIsSaving] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showTagMenu, setShowTagMenu] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Web Speech recognition support
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check speech recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript;
          }
        }
        if (transcript) {
          setContent((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = () => {
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      // Simulate quick voice memo prompt if browser doesn't permit
      setContent((prev) => (prev ? `${prev}\n🎙️ Voice note captured` : '🎙️ Voice note captured'));
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsRecording(true);
      } catch (e) {
        console.warn('Speech recognition start failed:', e);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter to quickly save
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(trimmed, noteType);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setSaveToast(noteType === 0 ? '⚡ Captured to Blinko' : '📝 Note saved');
      setTimeout(() => setSaveToast(null), 2200);
    } finally {
      setIsSaving(false);
    }
  };

  const insertText = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      setContent((prev) => prev + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextContent = content.substring(0, start) + textToInsert + content.substring(end);
    setContent(nextContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + textToInsert.length, start + textToInsert.length);
    }, 10);
  };

  // Auto-resize textarea
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 260)}px`;
  };

  const popularTags = Array.from(new Set(['idea', 'todo', 'work', 'note', ...existingTags])).slice(0, 5);

  return (
    <div className="relative rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl shadow-black/40 overflow-hidden transition-all focus-within:border-emerald-500/60 focus-within:ring-2 focus-within:ring-emerald-500/20">
      {/* Top Bar with Type Selector & Toast */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1 border-b border-slate-800/60 bg-slate-900/40">
        <div className="flex items-center gap-1.5 p-0.5 rounded-lg bg-slate-950/70 border border-slate-800">
          <button
            type="button"
            onClick={() => setNoteType(0)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              noteType === 0
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Blinko (Fleeting)</span>
          </button>
          <button
            type="button"
            onClick={() => setNoteType(1)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              noteType === 1
                ? 'bg-emerald-500/20 text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Permanent Note</span>
          </button>
        </div>

        {saveToast && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium animate-in fade-in slide-in-from-top-1">
            <Sparkles className="w-3 h-3" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* Text Area */}
      <div className="p-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={
            noteType === 0
              ? 'Capture a fleeting idea, thought, or link... (Press Cmd+Enter to send)'
              : '# Note Title\n\nDraft structured permanent notes, thoughts, and documents...'
          }
          className="w-full bg-transparent resize-none text-slate-100 placeholder-slate-500 text-sm leading-relaxed outline-hidden focus:outline-hidden min-h-[58px]"
        />
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-slate-800/40 text-slate-400">
        <div className="flex items-center gap-1 flex-wrap">
          {/* Add Todo */}
          <button
            type="button"
            onClick={() => insertText('- [ ] ')}
            className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-xs transition cursor-pointer"
            title="Insert Task item"
          >
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Todo</span>
          </button>

          {/* Quick Tag Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTagMenu(!showTagMenu)}
              className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 hover:text-slate-200 text-xs transition cursor-pointer"
              title="Add Tag"
            >
              <Hash className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Tag</span>
            </button>

            {showTagMenu && (
              <div className="absolute left-0 bottom-full mb-1 w-44 rounded-xl bg-slate-900 border border-slate-800 shadow-xl p-1.5 z-30">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">Quick Tags</div>
                {popularTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => {
                      insertText(` #${tag} `);
                      setShowTagMenu(false);
                    }}
                    className="w-full text-left px-2 py-1 rounded-md text-xs text-slate-200 hover:bg-emerald-500/20 hover:text-emerald-400 flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Hash className="w-3 h-3 text-emerald-400" />
                    <span>{tag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Voice to text */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition cursor-pointer ${
              isRecording
                ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                : 'hover:bg-slate-800 hover:text-slate-200'
            }`}
            title="Speech-to-text voice capture"
          >
            {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isRecording ? 'Listening...' : 'Voice'}</span>
          </button>
        </div>

        {/* Send Button & Shortcut Hint */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 hidden md:inline">⌘ + ↵</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={!content.trim() || isSaving}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-semibold px-4 py-1.5 text-xs transition cursor-pointer active:scale-95 shadow-md shadow-emerald-500/20"
          >
            <span>Capture</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
