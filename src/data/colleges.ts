// College is not present in the supplied data contract (sample-data-v2.json has
// no college/college_id field anywhere). This is a small, explicit, client-side
// configuration layer — DEMO DATA — that groups the existing 30 programs into two
// colleges using the one structural distinction the source data already carries
// (Program.type: "Residency" vs "Fellowship"). It never expands or narrows a
// user's authorized program scope; it only groups programs that are already
// authorized.
import type { Program } from "./types";
import { data, allowedPrograms } from "./repository";

export interface College {
  id: string;
  name: string;
  shortName: string;
  active: boolean;
}

export const COLLEGES: College[] = [
  {
    id: "COL-001",
    name: "OSU College of Osteopathic Medicine — Residency Programs",
    shortName: "OSU-COM Residency",
    active: true,
  },
  {
    id: "COL-002",
    name: "OSU College of Osteopathic Medicine — Fellowship & Subspecialty Programs",
    shortName: "OSU-COM Fellowship",
    active: true,
  },
];

export function collegeIdForProgram(program: Pick<Program, "type">): string {
  return program.type === "Fellowship" ? "COL-002" : "COL-001";
}

export function collegeForProgram(program: Pick<Program, "type">): College {
  const id = collegeIdForProgram(program);
  return COLLEGES.find((c) => c.id === id) || COLLEGES[0];
}

export function collegeName(id: string) {
  return COLLEGES.find((c) => c.id === id)?.shortName || "Unassigned College";
}

/** Colleges containing at least one program the user is authorized to see. */
export function getAuthorizedColleges(userId: string): College[] {
  const scope = allowedPrograms(userId);
  const present = new Set(scope.map((p) => collegeIdForProgram(p)));
  return COLLEGES.filter((c) => c.active && present.has(c.id));
}

/**
 * Authorized programs, optionally narrowed to one college. College filtering
 * is applied strictly on top of allowedPrograms(userId) — it can only narrow
 * the authorized set, never widen it.
 */
export function getProgramsByCollege(userId: string, collegeId = ""): Program[] {
  const scope = allowedPrograms(userId);
  return collegeId
    ? scope.filter((p) => collegeIdForProgram(p) === collegeId)
    : scope;
}

export function allProgramsByCollege(collegeId = ""): Program[] {
  return collegeId
    ? data.PROGRAM.filter((p) => collegeIdForProgram(p) === collegeId)
    : data.PROGRAM;
}
