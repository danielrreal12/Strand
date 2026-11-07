import { CREW, type CrewName, type SplicerNode } from "./splicer";

export function productionStats(nodes: SplicerNode[], start = "", end = "") {
  const undated = nodes.filter((node) => node.status === "completed" && !node.completed).length;
  const completed = nodes.filter((node) => node.status === "completed" && node.completed && (!start || node.completed >= start) && (!end || node.completed <= end));
  const attributed = completed.filter((node) => CREW.includes(node.completedBy as CrewName));
  const days = [...new Set(completed.map((node) => node.completed))].sort().reverse().map((day) => ({
    day,
    counts: Object.fromEntries(CREW.map((person) => [person, attributed.filter((node) => node.completed === day && node.completedBy === person).length])) as Record<CrewName, number>,
    unassigned: completed.filter((node) => node.completed === day && !CREW.includes(node.completedBy as CrewName)).length,
    total: completed.filter((node) => node.completed === day).length,
  }));
  const people = CREW.map((person) => {
    const own = attributed.filter((node) => node.completedBy === person).sort((a, b) => b.completed.localeCompare(a.completed) || a.code.localeCompare(b.code));
    const activeDays = new Set(own.map((node) => node.completed)).size;
    return { person, nodes: own, count: own.length, activeDays, average: activeDays ? own.length / activeDays : 0, share: attributed.length ? own.length / attributed.length * 100 : 0, bestDay: Math.max(0, ...days.map((day) => day.counts[person])) };
  });
  return { people, days, total: completed.length, attributed: attributed.length, unassigned: completed.length - attributed.length, undated };
}
