import { useSignal } from "@preact/signals";

interface Props {
  visitorId: string;
  isExcluded: boolean;
  readOnly?: boolean;
}

export default function BotActions({ visitorId, isExcluded, readOnly }: Props) {
  const excluded = useSignal(isExcluded);
  const loading = useSignal(false);
  const error = useSignal<string | null>(null);

  if (readOnly) return null;

  async function toggle() {
    loading.value = true;
    error.value = null;
    try {
      if (excluded.value) {
        const r = await fetch(
          `/api/bots/exclude/${encodeURIComponent(visitorId)}`,
          { method: "DELETE" },
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        excluded.value = false;
      } else {
        const r = await fetch("/api/bots/exclude", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitor_id: visitorId }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        excluded.value = true;
      }
    } catch {
      error.value = "Action failed";
    }
    loading.value = false;
  }

  return (
    <span>
      <button
        type="button"
        class={`px-2 py-1 text-xs font-medium border ${
          excluded.value
            ? "border-[var(--ea-border)] text-[var(--ea-primary)] hover:bg-[var(--ea-border)]"
            : "border-[var(--ea-danger-border)] text-[var(--ea-danger)] hover:bg-[var(--ea-danger-bg)]"
        } disabled:opacity-50`}
        onClick={toggle}
        disabled={loading.value}
      >
        {loading.value ? "..." : excluded.value ? "include" : "exclude"}
      </button>
      {error.value && (
        <span class="text-xs text-[var(--ea-danger)] ml-1">
          {error.value}
        </span>
      )}
    </span>
  );
}
