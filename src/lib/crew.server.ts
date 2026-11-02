import type { CrewName, CrewRole } from "./splicer";

export const CREW_DIRECTORY: { id: CrewName; name: string; initials: string; pin: string; role: CrewRole }[] = [
  { id: "Daniel", name: "Daniel Villarreal", initials: "DV", pin: "5796", role: "admin" },
  { id: "Iván", name: "Iván", initials: "IV", pin: "6841", role: "splicer" },
  { id: "Chris", name: "Chris", initials: "CH", pin: "9135", role: "splicer" },
];

export function memberById(id: string) {
  return CREW_DIRECTORY.find((member) => member.id === id) ?? null;
}

export function memberByPin(pin: string) {
  return CREW_DIRECTORY.find((member) => member.pin === pin) ?? null;
}
