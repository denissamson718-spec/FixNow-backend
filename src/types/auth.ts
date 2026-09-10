export type UserRole = "driver" | "mechanic";
export type AccountApprovalStatus = "approved" | "pending";

export type CredentialAsset = {
  uri: string;
  webUri?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
};

export type AccountLocation = {
  latitude: number;
  longitude: number;
  label?: string;
  updatedAt?: string;
};

export type UserProfile = {
  fullName: string;
  email: string;
  phone: string;
  profilePhoto?: CredentialAsset;
};

export type MechanicIdType = "NIDA" | "Voter's ID" | "Driver's License";
export type MechanicTransportMode = "walking" | "bicycle" | "motorcycle" | "car" | "tow-truck";

export type MechanicCredentials = {
  identificationType: MechanicIdType;
  identificationNumber?: string;
  identificationImage?: CredentialAsset;
  certificateDocument?: CredentialAsset;
  experienceYears: string;
  transportMode: MechanicTransportMode;
  workingGarage?: string;
  garageLocation?: string;
};

export type RegisteredAccount = {
  id: string;
  profile: UserProfile;
  role: UserRole;
  password: string;
  approvalStatus: AccountApprovalStatus;
  createdAt: string;
  linkedMechanicId?: string;
  mechanicCredentials?: MechanicCredentials;
  lastKnownLocation?: AccountLocation;
};
