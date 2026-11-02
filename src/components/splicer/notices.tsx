import { REVIEW_LABEL, type SplicerNode } from "@/lib/splicer";

export function NodeNotices({ node }: { node: SplicerNode }) {
  if (node.map && !node.reviewStatus) return null;
  return (
    <span className="node-notices">
      {!node.map ? <span className="notice-tag missing-map">Mapa por recibir</span> : null}
      {node.reviewStatus ? <span className="notice-tag review-note">{REVIEW_LABEL[node.reviewStatus] || node.reviewStatus}</span> : null}
    </span>
  );
}
