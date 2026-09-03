import { useEffect, useState, useCallback } from "react";

export type DailyLog = {
  date: string; // yyyy-mm-dd
  completedTasks: number;
  missedTasks: number;
  revenue: number; // INR
  profit: number; // INR
  deepWorkHours: number;
  salesHours: number;
  meetingsHours: number;
  learningHours: number;
  exerciseHours: number;
  sleepHours: number;
  notes?: string;
};

const KEY = "sangita.dailyLog.v1";

export const todayKey = () => new Date().toISOString().slice(0, 10);

export const emptyLog = (date = todayKey()): DailyLog => ({
  date,
  completedTasks: 0,
  missedTasks: 0,
  revenue: 0,
  profit: 0,
  deepWorkHours: 0,
  salesHours: 0,
  meetingsHours: 0,
  learningHours: 0,
  exerciseHours: 0,
  sleepHours: 0,
  notes: "",
});

function readAll(): Record<string, DailyLog> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, DailyLog>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function useDailyLog(date = todayKey()) {
  const [log, setLog] = useState<DailyLog>(() => emptyLog(date));
  const [history, setHistory] = useState<DailyLog[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const all = readAll();
    setLog(all[date] ?? emptyLog(date));
    setHistory(
      Object.values(all)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 7),
    );
    setHydrated(true);
  }, [date]);

  const update = useCallback(
    (patch: Partial<DailyLog>) => {
      setLog((prev) => {
        const next = { ...prev, ...patch, date };
        const all = readAll();
        all[date] = next;
        writeAll(all);
        setHistory(
          Object.values(all)
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .slice(0, 7),
        );
        return next;
      });
    },
    [date],
  );

  const reset = useCallback(() => {
    const all = readAll();
    delete all[date];
    writeAll(all);
    setLog(emptyLog(date));
    setHistory(
      Object.values(all)
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 7),
    );
  }, [date]);

  return { log, history, update, reset, hydrated };
}

export function totalProductiveHours(l: DailyLog) {
  return l.deepWorkHours + l.salesHours + l.meetingsHours + l.learningHours;
}

export function completionRate(l: DailyLog) {
  const total = l.completedTasks + l.missedTasks;
  return total === 0 ? 0 : Math.round((l.completedTasks / total) * 100);
}
