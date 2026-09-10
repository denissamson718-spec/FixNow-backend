import { PaymentMethod, ServiceRequest } from "../types";

export function createEmptyServiceRequest(overrides?: Partial<ServiceRequest>): ServiceRequest {
  return {
    id: `req-${Date.now()}`,
    vehicle: "",
    issue: "",
    locationLabel: "",
    latitude: 0,
    longitude: 0,
    budget: "",
    paymentMethod: "",
    notes: "",
    status: "draft",
    ...overrides
  };
}

export const defaultPaymentMethods: PaymentMethod[] = [];
