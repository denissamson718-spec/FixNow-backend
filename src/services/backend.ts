import Constants from "expo-constants";
import { Platform } from "react-native";

import { MechanicCredentials, MechanicOffer, Rating, RegisteredAccount, ServiceRequest, UserProfile, UserRole } from "../types";

function resolveBackendBaseUrl() {
  const extraConfig = (Constants.expoConfig?.extra ?? {}) as {
    backendUrl?: string;
  };
  const explicitUrl = extraConfig.backendUrl?.trim();

  if (explicitUrl) {
    return explicitUrl.replace(/\/$/, "");
  }

  if (Platform.OS === "web" && typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4010`;
  }

  const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri;
  const detectedHost = hostUri?.split(":")[0];

  if (detectedHost) {
    return `http://${detectedHost}:4010`;
  }

  return Platform.select({
    android: "http://10.0.2.2:4010",
    default: "http://localhost:4010"
  });
}

const baseUrl = resolveBackendBaseUrl() ?? "http://localhost:4010";
console.info(`[FixNow] Backend URL: ${baseUrl}`);

class BackendRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "BackendRequestError";
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });
  const responseText = await response.text();
  let payload: { message?: string } | undefined;

  try {
    payload = responseText ? (JSON.parse(responseText) as { message?: string }) : undefined;
  } catch {
    const contentType = response.headers.get("content-type") || "unknown content type";
    throw new BackendRequestError(
      response.status,
      `Backend returned invalid JSON (${response.status}, ${contentType}) for ${path}.`
    );
  }

  if (!response.ok) {
    const message = payload?.message?.trim();
    throw new BackendRequestError(response.status, message || `Request failed with status ${response.status}`);
  }

  if (payload === undefined) {
    throw new BackendRequestError(response.status, `Backend returned an empty response for ${path}.`);
  }

  return payload as T;
}

function buildQuery(params: Record<string, string | undefined>) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      query.set(key, value);
    }
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

type ServiceRequestResponse = ServiceRequest & {
  createdAt?: string;
  requestedByRole?: string;
};

type OfferResponse = MechanicOffer & {
  requestId?: string;
  createdAt?: string;
};

type PaymentResponse = {
  id: string;
  requestId?: string;
  mechanicId?: string;
  repairCost: string;
  platformFee: string;
  totalPaymentDue: string;
  status: string;
  createdAt?: string;
};

export async function fetchRegisteredAccounts() {
  const response = await request<{ accounts: RegisteredAccount[] }>("/api/accounts");
  return response.accounts;
}

export async function updateAccountLocation(
  accountId: string,
  payload: {
    latitude: number;
    longitude: number;
    label?: string;
  }
) {
  return request<{
    success: boolean;
    account?: RegisteredAccount;
  }>(`/api/accounts/${accountId}/location`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export async function updateAccountTransportMode(accountId: string, transportMode: string) {
  return request<{
    success: boolean;
    account?: RegisteredAccount;
  }>(`/api/accounts/${accountId}/transport`, {
    method: "PATCH",
    body: JSON.stringify({ transportMode })
  });
}

export async function signUpAccount({
  profile,
  role,
  password,
  credentials
}: {
  profile: UserProfile;
  role: UserRole;
  password: string;
  credentials?: MechanicCredentials;
}) {
  return request<{
    success: boolean;
    message?: string;
    account?: RegisteredAccount;
  }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({
      profile,
      role,
      password,
      credentials
    })
  });
}

export async function loginAccount(email: string, password: string) {
  return request<{
    success: boolean;
    message?: string;
    account?: RegisteredAccount;
    token?: string;
    user?: {
      id: string;
      email: string;
      fullName: string;
      role: UserRole;
    };
  }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password
    })
  });
}

export async function requestPasswordReset(email: string) {
  return request<{
    success: boolean;
    message?: string;
    resetLink?: string;
  }>("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({
      email
    })
  });
}

export async function approveMechanicAccountRequest(accountId: string) {
  return request<{
    success: boolean;
    message?: string;
    account?: RegisteredAccount;
  }>(`/api/admin/approve/${accountId}`, {
    method: "POST"
  });
}

export async function fetchServiceRequests() {
  const response = await request<{ serviceRequests: ServiceRequestResponse[] }>("/api/requests");
  return response.serviceRequests;
}

export async function createServiceRequestRecord(serviceRequest: ServiceRequest) {
  return request<{
    success: boolean;
    serviceRequest?: ServiceRequestResponse;
  }>("/api/requests", {
    method: "POST",
    body: JSON.stringify(serviceRequest)
  });
}

export async function updateServiceRequestRecord(requestId: string, updates: Partial<ServiceRequest>) {
  return request<{
    success: boolean;
    serviceRequest?: ServiceRequestResponse;
  }>(`/api/requests/${requestId}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
}

export async function fetchOffers(requestId?: string) {
  const response = await request<{ offers: OfferResponse[] }>(`/api/offers${buildQuery({ requestId })}`);
  return response.offers;
}

export async function createOfferRecord(
  payload: MechanicOffer & {
    requestId: string;
  }
) {
  return request<{
    success: boolean;
    offer?: OfferResponse;
  }>("/api/offers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateOfferRecord(offerId: string, updates: Partial<MechanicOffer>) {
  return request<{
    success: boolean;
    offer?: OfferResponse;
  }>(`/api/offers/${offerId}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  });
}

export async function fetchRatings(mechanicId?: string) {
  const response = await request<{ ratings: Rating[] }>(`/api/ratings${buildQuery({ mechanicId })}`);
  return response.ratings;
}

export async function createRatingRecord(payload: Omit<Rating, "id">) {
  return request<{
    success: boolean;
    rating?: Rating;
  }>("/api/ratings", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function fetchPayments(requestId?: string) {
  const response = await request<{ payments: PaymentResponse[] }>(`/api/payments${buildQuery({ requestId })}`);
  return response.payments;
}

export async function createPaymentRecord(payload: { requestId: string; mechanicId?: string; repairCost: string; status?: string }) {
  return request<{
    success: boolean;
    payment?: PaymentResponse;
  }>("/api/payments", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export { baseUrl as backendBaseUrl };
