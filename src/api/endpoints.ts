import { request } from "./client";
import type {
  DiaryEntry,
  ForwardingItem,
  Highlight,
  HighlightItem,
  Me,
  Part,
  PartCreate,
  Profile,
  ProfilePublic,
  PublicConfig,
  Report,
  Review,
  ReviewList,
  Vehicle,
} from "./types";

/** Tutte le chiamate al backend. Il token è passato esplicitamente (niente stato globale nascosto). */
export const api = {
  config: () => request<PublicConfig>("GET", "/v1/config"),

  requestMagicLink: (email: string) => request<void>("POST", "/v1/auth/magic-link", { json: { email } }),
  verify: (token: string) =>
    request<{ access_token: string }>("POST", "/v1/auth/verify", { json: { token } }),
  googleLogin: (credential: string) =>
    request<{ access_token: string }>("POST", "/v1/auth/google", { json: { credential } }),
  me: (token: string) => request<Me>("GET", "/v1/me", { token }),
  deleteAccount: (token: string) => request<void>("DELETE", "/v1/me", { token }),

  createProfile: (
    token: string,
    body: { handle: string; display_name: string; municipality: string; lat: number; lon: number; bio?: string; accept_terms: true },
  ) => request<Profile>("POST", "/v1/profiles", { token, json: body }),
  claimProfile: (token: string, claimToken: string) =>
    request<Profile>("POST", "/v1/profiles/claim", { token, json: { token: claimToken, accept_terms: true } }),
  getProfile: (handle: string) => request<ProfilePublic>("GET", `/v1/profiles/${handle}`),
  profileParts: (handle: string) => request<Part[]>("GET", `/v1/profiles/${handle}/parts`),
  profileVehicles: (handle: string) => request<Vehicle[]>("GET", `/v1/profiles/${handle}/vehicles`),

  searchParts: (query: {
    lat?: number;
    lon?: number;
    radius_km?: number;
    make?: string;
    category?: string;
    q?: string;
  }) => request<Part[]>("GET", "/v1/parts", { query }),
  myParts: (token: string) => request<Part[]>("GET", "/v1/parts/mine", { token }),
  createPart: (token: string, body: PartCreate) => request<Part>("POST", "/v1/parts", { token, json: body }),
  updatePart: (token: string, id: string, body: Partial<PartCreate>) =>
    request<Part>("PATCH", `/v1/parts/${id}`, { token, json: body }),
  deletePart: (token: string, id: string) => request<void>("DELETE", `/v1/parts/${id}`, { token }),
  uploadPartPhoto: (token: string, partId: string, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "photo.webp");
    return request<{ id: string; url: string }>("POST", `/v1/parts/${partId}/photos`, { token, form });
  },
  deletePartPhoto: (token: string, id: string) => request<void>("DELETE", `/v1/part-photos/${id}`, { token }),
  contactSeller: (token: string, partId: string, message: string) =>
    request<{ id: string }>("POST", `/v1/parts/${partId}/contacts`, { token, json: { message } }),

  myVehicles: (token: string) => request<Vehicle[]>("GET", "/v1/vehicles/mine", { token }),
  createVehicle: (
    token: string,
    body: { make: string; model: string; year: number; title: string; is_public?: boolean },
  ) => request<Vehicle>("POST", "/v1/vehicles", { token, json: body }),
  deleteVehicle: (token: string, id: string) => request<void>("DELETE", `/v1/vehicles/${id}`, { token }),
  vehicleEntries: (id: string) => request<DiaryEntry[]>("GET", `/v1/vehicles/${id}/entries`),
  addEntry: (
    token: string,
    vehicleId: string,
    body: { title: string; body: string; phase: string; occurred_on: string; show_in_feed: boolean },
  ) => request<DiaryEntry>("POST", `/v1/vehicles/${vehicleId}/entries`, { token, json: body }),
  uploadPhoto: (token: string, entryId: string, file: Blob) => {
    const form = new FormData();
    form.append("file", file, "photo.webp");
    return request<{ id: string; url: string }>("POST", `/v1/entries/${entryId}/photos`, { token, form });
  },

  highlights: (handle: string) => request<Highlight[]>("GET", `/v1/profiles/${handle}/highlights`),
  createHighlight: (token: string, title: string) =>
    request<Highlight>("POST", "/v1/highlights", { token, json: { title } }),
  deleteHighlight: (token: string, id: string) => request<void>("DELETE", `/v1/highlights/${id}`, { token }),
  addHighlightItem: (token: string, highlightId: string, file: Blob, caption: string) => {
    const form = new FormData();
    form.append("file", file, "photo.webp");
    form.append("caption", caption);
    return request<HighlightItem>("POST", `/v1/highlights/${highlightId}/items`, { token, form });
  },
  deleteHighlightItem: (token: string, id: string) =>
    request<void>("DELETE", `/v1/highlight-items/${id}`, { token }),

  reviews: (handle: string) => request<ReviewList>("GET", `/v1/profiles/${handle}/reviews`),
  createReview: (token: string, handle: string, body: { rating: number; text: string }) =>
    request<Review>("POST", `/v1/profiles/${handle}/reviews`, { token, json: body }),
  replyReview: (token: string, id: string, text: string) =>
    request<Review>("POST", `/v1/reviews/${id}/reply`, { token, json: { text } }),
  report: (
    token: string,
    body: { target_type: "profile" | "part" | "review" | "entry"; target_id: string; reason: string; details?: string },
  ) => request<Report>("POST", "/v1/reports", { token, json: body }),

  admin: {
    createProfile: (
      token: string,
      body: { handle: string; display_name: string; municipality: string; lat: number; lon: number },
    ) =>
      request<{ profile: Profile; claim_token: string; claim_url: string }>("POST", "/v1/admin/profiles", {
        token,
        json: body,
      }),
    addPart: (token: string, profileId: string, body: PartCreate) =>
      request<Part>("POST", `/v1/admin/profiles/${profileId}/parts`, { token, json: body }),
    contactsToForward: (token: string, status: "pending" | "forwarded" = "pending") =>
      request<ForwardingItem[]>("GET", "/v1/admin/contacts", { token, query: { status } }),
    markForwarded: (token: string, id: string) =>
      request<void>("POST", `/v1/admin/contacts/${id}/forwarded`, { token }),
    reissueClaim: (token: string, profileId: string) =>
      request<{ claim_token: string; claim_url: string }>("POST", `/v1/admin/profiles/${profileId}/claim-token`, { token }),
    reports: (token: string) => request<Report[]>("GET", "/v1/admin/reports", { token }),
    resolveReport: (token: string, id: string, action: "dismiss" | "remove") =>
      request<Report>("POST", `/v1/admin/reports/${id}/resolve`, { token, json: { action } }),
  },
};
