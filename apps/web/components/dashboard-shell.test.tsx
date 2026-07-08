import { describe, expect, it } from "vitest";
import { sections } from "@repo/types";

describe("master data bootstrap", () => {
  it("keeps 3 process sections", () => {
    expect(sections).toHaveLength(3);
  });
});
