import { describe, expect, test } from "bun:test";

import {
  hydrateProfileFromRelationRows,
  resolveSettingRelationIds,
} from "./member-user-relations";

describe("member-user-relations", () => {
  test("resolveSettingRelationIds filters by credit and group", () => {
    const relations = [
      {
        id: 1,
        business_id: 10,
        credit_id: 1,
        group_id: 2,
        is_active: true,
        credit_name: "C1",
        group_name: "G1",
      },
      {
        id: 2,
        business_id: 10,
        credit_id: 1,
        group_id: 3,
        is_active: true,
        credit_name: "C1",
        group_name: "G2",
      },
    ];
    expect(
      resolveSettingRelationIds(relations, ["1"], ["2"])
    ).toEqual([1]);
  });

  test("hydrateProfileFromRelationRows dedupes ids", () => {
    const out = hydrateProfileFromRelationRows([
      {
        id: 1,
        business_id: 5,
        credit_id: 1,
        group_id: 2,
      },
      {
        id: 2,
        business_id: 5,
        credit_id: 1,
        group_id: 3,
      },
    ]);
    expect(out.businessId).toBe("5");
    expect(out.creditIds).toEqual(["1"]);
    expect(out.groupIds.sort()).toEqual(["2", "3"]);
  });
});
