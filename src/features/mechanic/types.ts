import { MechanicTransportType } from "../../utils/transport";

export type Mechanic = {
  id: string;
  name: string;
  specialty: string;
  rating: number;
  etaMinutes: number;
  distanceKm: number;
  latitude: number;
  longitude: number;
  profilePhoto: string;
  serviceFee: string;
  isAvailable: boolean;
};

export type MechanicOfferStatus = "pending" | "accepted" | "declined";

export type MechanicOffer = {
  id: string;
  mechanicId: string;
  transportType?: MechanicTransportType;
  price: string;
  basePrice?: string;
  surcharge?: string;
  etaMinutes: number;
  distanceKm: number;
  message: string;
  status: MechanicOfferStatus;
};

export type Rating = {
  id: string;
  mechanicId: string;
  mechanicName: string;
  score: number;
  comment: string;
  date: string;
};
