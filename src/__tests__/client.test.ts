import { ApiError, request } from "../api/client";

function mockFetch(status: number, body?: unknown) {
  const fn = vi.fn().mockResolvedValue(new Response(body === undefined ? null : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fn);
  return fn;
}
afterEach(() => vi.unstubAllGlobals());

describe("api client", () => {
  it("manda token e JSON e costruisce la query ignorando i valori vuoti", async () => {
    const fn = mockFetch(200, [{ id: "1" }]);
    await request("GET", "/v1/parts", { token: "abc", query: { q: "faro", make: "", radius_km: 10, lat: undefined } });
    const [url, init] = fn.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/parts?q=faro&radius_km=10");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer abc");
  });

  it("traduce gli errori del backend in ApiError con codice", async () => {
    mockFetch(409, { error: { code: "vehicle_limit_reached", message: "Limite" } });
    await expect(request("POST", "/v1/vehicles", { json: {} })).rejects.toMatchObject({
      status: 409, code: "vehicle_limit_reached", message: "Limite",
    });
  });

  it("gestisce 204 e risposte non JSON", async () => {
    mockFetch(204);
    await expect(request("DELETE", "/v1/me")).resolves.toBeUndefined();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>", { status: 502 })));
    await expect(request("GET", "/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("segnala la rete assente con un errore leggibile", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await expect(request("GET", "/x")).rejects.toMatchObject({ code: "network_error" });
  });
});
