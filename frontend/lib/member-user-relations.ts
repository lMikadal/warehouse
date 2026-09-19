export type MemberBusinessRelationRow = {
  id: number;
  credit_id: number;
  group_id: number;
  business_id: number;
  is_active: boolean;
  credit_name?: string;
  group_name?: string;
};

export type MemberSettingRelationFilterRow = {
  id: number;
  business_id: number;
  credit_id: number;
  group_id: number;
  credit_name?: string;
  group_name?: string;
};

export type RemoteOption = { value: string; label: string };

export function creditOptionsFromRelations(
  relations: MemberBusinessRelationRow[]
): RemoteOption[] {
  const seen = new Set<number>();
  const out: RemoteOption[] = [];
  for (const r of relations) {
    if (!r.is_active || seen.has(r.credit_id)) continue;
    seen.add(r.credit_id);
    out.push({
      value: String(r.credit_id),
      label: r.credit_name?.trim() || `#${r.credit_id}`,
    });
  }
  return out;
}

export function groupOptionsFromRelations(
  relations: MemberBusinessRelationRow[],
  creditIds: string[]
): RemoteOption[] {
  const allow = new Set(creditIds.map(Number));
  const filterCredits = creditIds.length > 0;
  const seen = new Set<number>();
  const out: RemoteOption[] = [];
  for (const r of relations) {
    if (!r.is_active) continue;
    if (filterCredits && !allow.has(r.credit_id)) continue;
    if (seen.has(r.group_id)) continue;
    seen.add(r.group_id);
    out.push({
      value: String(r.group_id),
      label: r.group_name?.trim() || `#${r.group_id}`,
    });
  }
  return out;
}

export function resolveSettingRelationIds(
  relations: MemberBusinessRelationRow[],
  creditIds: string[],
  groupIds: string[]
): number[] {
  const credits = new Set(creditIds.map(Number));
  const groups = new Set(groupIds.map(Number));
  const filterCredits = creditIds.length > 0;
  const filterGroups = groupIds.length > 0;
  return relations
    .filter((r) => {
      if (!r.is_active) return false;
      if (filterCredits && !credits.has(r.credit_id)) return false;
      if (filterGroups && !groups.has(r.group_id)) return false;
      return true;
    })
    .map((r) => r.id);
}

export function hydrateProfileFromRelationRows(
  rows: MemberSettingRelationFilterRow[]
): {
  businessId: string;
  creditIds: string[];
  groupIds: string[];
} {
  const creditIds: string[] = [];
  const groupIds: string[] = [];
  let businessId = "";
  for (const r of rows) {
    if (!businessId && r.business_id > 0) {
      businessId = String(r.business_id);
    }
    const c = String(r.credit_id);
    if (r.credit_id > 0 && !creditIds.includes(c)) creditIds.push(c);
    const g = String(r.group_id);
    if (r.group_id > 0 && !groupIds.includes(g)) groupIds.push(g);
  }
  return { businessId, creditIds, groupIds };
}

export function filterOptionsBySearch(
  options: RemoteOption[],
  search: string
): RemoteOption[] {
  const q = search.trim().toLowerCase();
  if (!q) return options;
  return options.filter((o) => o.label.toLowerCase().includes(q));
}

export function pruneGroupIds(
  relations: MemberBusinessRelationRow[],
  creditIds: string[],
  groupIds: string[]
): string[] {
  const allowed = new Set(
    groupOptionsFromRelations(relations, creditIds).map((o) => o.value)
  );
  return groupIds.filter((id) => allowed.has(id));
}
