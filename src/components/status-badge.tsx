import { Badge } from "@/components/ui/badge";
import type { InvoiceStatus, JobStatus, SpliceGrade } from "@/lib/types";

const jobStyles: Record<JobStatus, string> = {
  scheduled: "border-chart-3/40 bg-chart-3/15 text-chart-3",
  in_progress: "border-primary/40 bg-primary/15 text-primary",
  done: "border-border bg-muted text-muted-foreground",
  blocked: "border-destructive/40 bg-destructive/15 text-destructive",
};

const jobLabels: Record<JobStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "Live",
  done: "Done",
  blocked: "Blocked",
};

const invoiceStyles: Record<InvoiceStatus, string> = {
  draft: "border-border bg-muted text-muted-foreground",
  sent: "border-chart-3/40 bg-chart-3/15 text-chart-3",
  paid: "border-primary/40 bg-primary/15 text-primary",
  overdue: "border-destructive/40 bg-destructive/15 text-destructive",
};

const gradeStyles: Record<SpliceGrade, string> = {
  A: "border-primary/40 bg-primary/15 text-primary",
  B: "border-chart-3/40 bg-chart-3/15 text-chart-3",
  C: "border-copper/40 bg-copper/15 text-copper",
  fail: "border-destructive/40 bg-destructive/15 text-destructive",
};

export function JobBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={jobStyles[status]}>
      {status === "in_progress" && (
        <span className="pulse-live mr-1 inline-block size-1.5 rounded-full bg-primary" />
      )}
      {jobLabels[status]}
    </Badge>
  );
}

export function InvoiceBadge({ status }: { status: InvoiceStatus }) {
  return (
    <Badge variant="outline" className={`capitalize ${invoiceStyles[status]}`}>
      {status}
    </Badge>
  );
}

export function GradeBadge({ grade }: { grade: SpliceGrade }) {
  return (
    <Badge variant="outline" className={gradeStyles[grade]}>
      {grade === "fail" ? "Re-splice" : `Grade ${grade}`}
    </Badge>
  );
}
