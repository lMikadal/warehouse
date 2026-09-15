import { describe, expect, test } from "bun:test";

import {
  tableIconActionsFromResource,
  type ResourceActions,
} from "./admin-permissions";

const viewOnly: ResourceActions = {
  view: true,
  create: false,
  update: false,
  delete: false,
};

const updateDelete: ResourceActions = {
  view: true,
  create: false,
  update: true,
  delete: true,
};

describe("tableIconActionsFromResource", () => {
  test("view only", () => {
    expect(tableIconActionsFromResource(viewOnly)).toEqual(["view"]);
  });

  test("update shows edit not view", () => {
    expect(tableIconActionsFromResource(updateDelete)).toEqual([
      "edit",
      "delete",
    ]);
  });

  test("editOnlyRowId with view only", () => {
    expect(
      tableIconActionsFromResource(viewOnly, { rowId: 1, editOnlyRowId: 1 })
    ).toEqual(["view"]);
  });

  test("editOnlyRowId with update", () => {
    expect(
      tableIconActionsFromResource(updateDelete, { rowId: 1, editOnlyRowId: 1 })
    ).toEqual(["edit"]);
  });
});
