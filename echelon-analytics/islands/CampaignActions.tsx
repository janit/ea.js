import { useEffect, useRef } from "preact/hooks";

export default function CampaignActions() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(e: Event) {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-campaign-id]",
      );
      if (!btn) return;
      const campaignId = btn.dataset.campaignId;
      const status = btn.dataset.status;
      const action = btn.dataset.action;

      if (!campaignId) return;

      if (action === "delete") {
        if (!confirm("Delete this campaign?")) return;
        fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
          method: "DELETE",
        }).then((r) => {
          if (r.ok) location.href = "/admin/campaigns";
          else alert("Failed to delete campaign");
        }).catch(() => alert("Failed to delete campaign"));
        return;
      }

      if (!status) return;
      fetch(`/api/campaigns/${encodeURIComponent(campaignId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then((r) => {
        if (r.ok) location.reload();
        else alert("Failed to update campaign status");
      }).catch(() => alert("Failed to update campaign status"));
    }

    container.addEventListener("click", handleClick);
    return () => container.removeEventListener("click", handleClick);
  }, []);

  return <div ref={containerRef} style="display:contents" />;
}
