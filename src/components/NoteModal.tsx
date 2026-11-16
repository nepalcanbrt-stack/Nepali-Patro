import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { BS_MONTHS_EN, BS_MONTHS_NE } from '../data/bsCalendarData';
import { UserNote } from '../types/app';
import { bsToKey, formatBsDateNe, getDaysInBsMonth } from '../utils/nepaliDate';

interface NoteModalProps {
  isOpen: boolean;
  initialBsDate: { year: number; month: number; day: number };
  onClose: () => void;
  onSave: (entry: Omit<UserNote, 'id' | 'createdAt'>) => Promise<unknown> | void;
}

export function NoteModal({ isOpen, initialBsDate, onClose, onSave }: NoteModalProps) {
  const [year, setYear] = useState(initialBsDate.year);
  const [month, setMonth] = useState(initialBsDate.month);
  const [day, setDay] = useState(initialBsDate.day);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [time, setTime] = useState('');
  const [category, setCategory] = useState<UserNote['category']>('personal');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setYear(initialBsDate.year);
      setMonth(initialBsDate.month);
      setDay(initialBsDate.day);
      setTitle('');
      setNote('');
      setTime('');
      setCategory('personal');
      setSaving(false);
    }
  }, [isOpen, initialBsDate]);

  if (!isOpen) return null;

  const maxDay = getDaysInBsMonth(year, month);
  const safeDay = Math.min(day, maxDay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      await onSave({
        bsKey: bsToKey(year, month, safeDay),
        title: title.trim().slice(0, 120),
        note: note.trim().slice(0, 1000),
        time: time.trim().slice(0, 32) || undefined,
        category,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="note-modal-title"
    >
      <div className="w-full sm:max-w-md bg-[var(--bg-surface)] text-[var(--text-primary)] rounded-t-3xl sm:rounded-3xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-in fade-in duration-150">
        <div className="sm:hidden w-10 h-1.5 bg-[var(--border-accent)]/60 rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[var(--border-soft)]">
          <div>
            <h2 id="note-modal-title" className="text-lg font-bold text-[var(--text-primary)]">
              Add Personal Note
            </h2>
            <p className="text-xs text-[var(--text-muted)] font-devanagari">
              {formatBsDateNe({ year, month, day: safeDay })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-[var(--bg-surface-soft)] transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">BS Year</label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full h-11 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
              >
                {[2080, 2081, 2082, 2083, 2084, 2085, 2086].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Month</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full h-11 px-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
              >
                {BS_MONTHS_EN.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {BS_MONTHS_NE[idx]} ({m})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Day</label>
              <select
                value={safeDay}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full h-11 px-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm font-medium text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
              >
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="note-title" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Event Title
            </label>
            <input
              id="note-title"
              type="text"
              required
              maxLength={120}
              placeholder="e.g., Family Puja, Birthday, Meeting"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as UserNote['category'])}
                className="w-full h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
              >
                <option value="personal">Personal</option>
                <option value="puja">Puja / Ritual</option>
                <option value="birthday">Birthday</option>
                <option value="reminder">Reminder</option>
              </select>
            </div>
            <div>
              <label htmlFor="note-time" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                Time (Optional)
              </label>
              <input
                id="note-time"
                type="text"
                maxLength={32}
                placeholder="e.g., 07:30 AM"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="note-body" className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
              Details (Optional)
            </label>
            <textarea
              id="note-body"
              rows={3}
              maxLength={1000}
              placeholder="Add notes, items to prepare, or reminders..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-link)] resize-none"
            />
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-soft)] text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-12 rounded-xl bg-[var(--accent-primary)] text-sm font-semibold text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-60 active:scale-[0.99] transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
