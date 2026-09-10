export type ServiceRequestStatus =
  | "draft"
  | "searching"
  | "reviewing"
  | "accepted"
  | "arriving"
  | "completed";

export type JobMessage = {
  id: string;
  senderRole: "driver" | "mechanic";
  senderName: string;
  text: string;
  photoUri?: string;
  createdAt: string;
};

export type ServiceRequest = {
  id: string;
  requestedByAccountId?: string;
  vehicle: string;
  issue: string;
  locationLabel: string;
  latitude: number;
  longitude: number;
  budget: string;
  paymentMethod: string;
  notes: string;
  messages?: JobMessage[];
  videoRoomId?: string;
  status: ServiceRequestStatus;
  assignedMechanicId?: string;
  selectedOfferId?: string;
  agreedPrice?: string;
  repairCost?: string;
  platformFee?: string;
  totalPaymentDue?: string;
};

export type PaymentMethod = {
  id: string;
  brand: string;
  label: string;
  isDefault: boolean;
};
