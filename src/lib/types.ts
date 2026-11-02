export type JobStatus = "scheduled" | "in_progress" | "done" | "blocked";
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type SpliceGrade = "A" | "B" | "C" | "fail";

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  status: "on_site" | "en_route" | "off";
  zone: string;
}

export interface Job {
  id: string;
  title: string;
  client: string;
  address: string;
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  status: JobStatus;
  splicesPlanned: number;
  splicesDone: number;
  crewIds: string[];
  notes?: string;
}

export interface ProductionEntry {
  id: string;
  jobId: string;
  jobTitle: string;
  tech: string;
  fiber: string;
  lossDb: number;
  grade: SpliceGrade;
  timestamp: string;
}

export interface Invoice {
  id: string;
  number: string;
  client: string;
  jobTitle: string;
  amount: number;
  status: InvoiceStatus;
  issued: string;
  due: string;
}
