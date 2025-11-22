// tests/getAssets.test.js
import { jest } from "@jest/globals";

// mock node-fetch avant d'importer le service
jest.unstable_mockModule("node-fetch", () => ({
  default: jest.fn()
}));

const { default: fetch } = await import("node-fetch");
const { getAssets } = await import("../collector/services/coincapService.js");

test("getAssets retourne un tableau", async () => {
  const fakeData = { data: [{ id: "btc", priceUsd: "60000" }] };

  fetch.mockResolvedValue({
    ok: true,
    json: async () => fakeData
  });

  const assets = await getAssets(1);

  expect(Array.isArray(assets)).toBe(true);
  expect(assets.length).toBe(1);
  expect(assets[0]).toHaveProperty("id");
});
