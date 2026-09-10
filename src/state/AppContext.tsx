import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Vibration } from "react-native";

import { MapSource } from "../components/MapSourceSwitch";
import { useLiveLocation } from "../hooks/useLiveLocation";
import { MechanicTransportType, estimateTransportEtaMinutes, getTransportLabel } from "../utils/transport";
import { addPercentageCharge, formatCurrency, parseCurrency } from "../utils/pricing";
import { createEmptyServiceRequest, defaultPaymentMethods } from "./defaults";
import {
  approveMechanicAccountRequest,
  createOfferRecord,
  createPaymentRecord,
  createRatingRecord,
  createServiceRequestRecord,
  fetchOffers,
  fetchRatings,
  fetchRegisteredAccounts,
  fetchServiceRequests,
  loginAccount,
  signUpAccount,
  updateAccountTransportMode as persistAccountTransportMode,
  updateAccountLocation,
  updateOfferRecord,
  updateServiceRequestRecord
} from "../services/backend";
import { prepareLocalNotifications, sendLiveRequestPanelNotification } from "../services/notifications";
import {
  Mechanic,
  MechanicCredentials,
  MechanicOffer,
  JobMessage,
  PaymentMethod,
  Rating,
  RegisteredAccount,
  ServiceRequest,
  UserProfile,
  UserRole
} from "../types";

type AuthResult = {
  success: boolean;
  message?: string;
};

type MechanicNotification = {
  requestId: string;
  title: string;
  message: string;
};

type AppContextValue = {
  isAuthenticated: boolean;
  userName: string;
  role: UserRole;
  userProfile: UserProfile;
  registeredAccounts: RegisteredAccount[];
  pendingApprovalAccount?: RegisteredAccount;
  mechanicCredentials?: MechanicCredentials;
  currentMechanic?: Mechanic;
  mechanics: Mechanic[];
  offers: MechanicOffer[];
  ratings: Rating[];
  paymentMethods: PaymentMethod[];
  activeRequest: ServiceRequest;
  openServiceRequests: ServiceRequest[];
  mechanicNotification?: MechanicNotification;
  mapSource: MapSource;
  unreadJobMessageCount: number;
  signUp: (profile: UserProfile, role: UserRole, password: string, credentials?: MechanicCredentials) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  approveMechanicAccount: (accountId: string) => Promise<void>;
  signOut: () => void;
  clearPendingApproval: () => void;
  updateRequest: (updates: Partial<ServiceRequest>) => void;
  submitRequest: (overrides?: Partial<ServiceRequest>) => void;
  selectOffer: (offerId: string) => void;
  sendMechanicOffer: (mechanicId: string, price: string, transportType: MechanicTransportType) => void;
  sendJobMessage: (text: string, photoUri?: string) => void;
  markJobMessagesRead: () => void;
  completeServiceWithCost: (repairCost: string) => void;
  submitMechanicRating: (score: number, comment?: string) => void;
  advanceRequestStatus: () => void;
  resetRequest: () => void;
  setMapSource: (mapSource: MapSource) => void;
  updateMechanicTransportMode: (transportMode: MechanicTransportType) => void;
  dismissMechanicNotification: () => void;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);
const initialRequest = createEmptyServiceRequest();

function hasDraftRequestChanges(request: ServiceRequest) {
  return (
    request.vehicle !== initialRequest.vehicle ||
    request.issue !== initialRequest.issue ||
    request.locationLabel !== initialRequest.locationLabel ||
    request.budget !== initialRequest.budget ||
    request.paymentMethod !== initialRequest.paymentMethod ||
    request.notes !== initialRequest.notes
  );
}

function mergeRequestWithDefaults(request?: Partial<ServiceRequest>) {
  return {
    ...initialRequest,
    ...request
  };
}

function buildMechanicNotification(request: ServiceRequest, openJobCount: number): MechanicNotification {
  const countLabel = openJobCount === 1 ? "1 live driver request" : `${openJobCount} live driver requests`;

  return {
    requestId: request.id,
    title: "New driver request",
    message: `${request.issue} for ${request.vehicle} near ${request.locationLabel}. ${countLabel} waiting now.`
  };
}

function stripOfferMetadata(offer: MechanicOffer & { requestId?: string; createdAt?: string }) {
  const { createdAt, requestId, ...localOffer } = offer;
  return localOffer;
}

function calculateDistanceKm(startLatitude: number, startLongitude: number, endLatitude: number, endLongitude: number) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = toRadians(endLatitude - startLatitude);
  const deltaLongitude = toRadians(endLongitude - startLongitude);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(startLatitude)) *
      Math.cos(toRadians(endLatitude)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusKm * c;
}

function hasValidCoordinates(latitude?: number, longitude?: number) {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Boolean(latitude || longitude);
}

function estimateEtaMinutes(distanceKm: number) {
  return Math.max(1, Math.ceil(distanceKm * 3.4));
}

function resolveMechanicIdForAccount(account: RegisteredAccount, mechanicList: Mechanic[]) {
  if (account.linkedMechanicId && mechanicList.some((mechanic) => mechanic.id === account.linkedMechanicId)) {
    return account.linkedMechanicId;
  }

  const matchingMechanic = mechanicList.find(
    (mechanic) => mechanic.name.trim().toLowerCase() === account.profile.fullName.trim().toLowerCase()
  );

  return matchingMechanic?.id ?? account.linkedMechanicId ?? account.id;
}

function buildMechanicFromAccount(account: RegisteredAccount, currentCount: number): Mechanic {
  const garageName = account.mechanicCredentials?.workingGarage?.trim();
  const liveLatitude = account.lastKnownLocation?.latitude;
  const liveLongitude = account.lastKnownLocation?.longitude;
  const hasLiveLocation = hasValidCoordinates(liveLatitude, liveLongitude);

  return {
    id: account.linkedMechanicId ?? account.id,
    name: account.profile.fullName,
    specialty: garageName || "Verified roadside mechanic",
    rating: 0,
    etaMinutes: 0,
    distanceKm: 0,
    latitude: hasLiveLocation ? liveLatitude! : 0,
    longitude: hasLiveLocation ? liveLongitude! : 0,
    profilePhoto: account.profile.profilePhoto?.uri ?? "",
    serviceFee: "",
    isAvailable: hasLiveLocation
  };
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    fullName: "",
    email: "",
    phone: ""
  });
  const [role, setRole] = useState<UserRole>("driver");
  const [mechanicCredentials, setMechanicCredentials] = useState<MechanicCredentials | undefined>(undefined);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [currentMechanicId, setCurrentMechanicId] = useState<string | undefined>(undefined);
  const [currentAccountId, setCurrentAccountId] = useState<string | undefined>(undefined);
  const [activeRequest, setActiveRequest] = useState<ServiceRequest>(initialRequest);
  const [openServiceRequests, setOpenServiceRequests] = useState<ServiceRequest[]>([]);
  const [mechanicNotification, setMechanicNotification] = useState<MechanicNotification | undefined>(undefined);
  const [mapSource, setMapSource] = useState<MapSource>("openstreetmap");
  const [offers, setOffers] = useState<MechanicOffer[]>([]);
  const [ratingsState, setRatingsState] = useState<Rating[]>([]);
  const [registeredAccounts, setRegisteredAccounts] = useState<RegisteredAccount[]>([]);
  const [pendingApprovalAccount, setPendingApprovalAccount] = useState<RegisteredAccount | undefined>(undefined);
  const [readJobMessageIds, setReadJobMessageIds] = useState<Set<string>>(() => new Set());
  const activeRequestRef = useRef(activeRequest);
  const accountLiveLocation = useLiveLocation(isAuthenticated && (role === "mechanic" || role === "driver"));
  const lastPublishedAccountLocationRef = useRef<string>("");
  const lastPublishedDriverRequestLocationRef = useRef<string>("");
  const hasPreparedMechanicNotificationsRef = useRef(false);
  const previousOpenRequestIdsRef = useRef<string[]>([]);
  const hasHydratedMechanicRequestsRef = useRef(false);
  const dismissedMechanicNotificationRequestIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    activeRequestRef.current = activeRequest;
  }, [activeRequest]);

  const mechanicsWithRatings = useMemo(
    () =>
      mechanics.map((mechanic) => {
        const mechanicRatings = ratingsState.filter((rating) => rating.mechanicId === mechanic.id);

        if (!mechanicRatings.length) {
          return mechanic;
        }

        const average =
          mechanicRatings.reduce((total, rating) => total + rating.score, 0) / mechanicRatings.length;

        return {
          ...mechanic,
          rating: Number(average.toFixed(1))
        };
      }),
    [mechanics, ratingsState]
  );
  const unreadJobMessageCount = useMemo(
    () =>
      (activeRequest.messages ?? []).filter(
        (message) => message.senderRole !== role && !readJobMessageIds.has(message.id)
      ).length,
    [activeRequest.messages, readJobMessageIds, role]
  );

  const currentMechanic = mechanicsWithRatings.find((mechanic) => mechanic.id === currentMechanicId);

  const syncApprovedMechanics = (accounts: RegisteredAccount[]) => {
    setMechanics((current) => {
      let nextMechanics = [...current];

      accounts
        .filter((account) => account.role === "mechanic" && account.approvalStatus === "approved")
        .forEach((account) => {
          const mechanicId = resolveMechanicIdForAccount(account, nextMechanics);
          const mechanicDraft = buildMechanicFromAccount(
            {
              ...account,
              linkedMechanicId: mechanicId
            },
            nextMechanics.length
          );
          const liveLatitude = account.lastKnownLocation?.latitude;
          const liveLongitude = account.lastKnownLocation?.longitude;
          const nextMechanic = {
            ...mechanicDraft,
            latitude: typeof liveLatitude === "number" ? liveLatitude : mechanicDraft.latitude,
            longitude: typeof liveLongitude === "number" ? liveLongitude : mechanicDraft.longitude
          };
          const existingIndex = nextMechanics.findIndex((mechanic) => mechanic.id === mechanicId);

          if (existingIndex >= 0) {
            nextMechanics[existingIndex] = {
              ...nextMechanics[existingIndex],
              ...nextMechanic,
              id: mechanicId
            };
            return;
          }

          nextMechanics.push(nextMechanic);
        });

      return nextMechanics;
    });
  };

  useEffect(() => {
    let isMounted = true;
    let hasLoggedFailure = false;

    const refreshAccounts = async () => {
      try {
        const accounts = await fetchRegisteredAccounts();
        hasLoggedFailure = false;

        if (!isMounted) {
          return;
        }

        setRegisteredAccounts(accounts);
        syncApprovedMechanics(accounts);

        if (pendingApprovalAccount?.id) {
          const matchingAccount = accounts.find((account) => account.id === pendingApprovalAccount.id);

          if (matchingAccount?.role === "mechanic" && matchingAccount.approvalStatus === "approved") {
            setPendingApprovalAccount(undefined);
            applySession(matchingAccount);
          } else if (matchingAccount) {
            setPendingApprovalAccount(matchingAccount);
          }
        }
      } catch (error) {
        if (__DEV__ && !hasLoggedFailure) {
          hasLoggedFailure = true;
          console.warn("Failed to fetch shared account data from admin server.", error);
        }
      }
    };

    refreshAccounts();
    const intervalId = setInterval(refreshAccounts, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [pendingApprovalAccount?.id]);

  useEffect(() => {
    let isMounted = true;
    let hasLoggedFailure = false;

    const refreshMarketplace = async () => {
      try {
        const [serviceRequests, offerRecords, remoteRatings] = await Promise.all([
          fetchServiceRequests(),
          fetchOffers(),
          fetchRatings()
        ]);
        hasLoggedFailure = false;

        if (!isMounted) {
          return;
        }

        const currentRequest = activeRequestRef.current;
        const nextOpenRequests = serviceRequests
          .filter((request) => request.status !== "completed")
          .map((request) => mergeRequestWithDefaults(request));
        const latestOpenRequest = nextOpenRequests[0];
        const driverOwnedRequest =
          role === "driver" && currentAccountId
            ? nextOpenRequests.find((request) => request.requestedByAccountId === currentAccountId) ??
              nextOpenRequests.find((request) => request.id === currentRequest.id)
            : undefined;
        const nextVisibleRequest = role === "mechanic" ? latestOpenRequest : driverOwnedRequest ?? latestOpenRequest;
        const shouldUseRemoteRequest =
          Boolean(nextVisibleRequest) && (role === "mechanic" || currentRequest.status !== "draft");

        setOpenServiceRequests(nextOpenRequests);

        setActiveRequest((current) => {
          if (nextVisibleRequest) {
            if (role !== "mechanic" && current.status === "draft") {
              return current;
            }

            return nextVisibleRequest;
          }

          if (current.status === "completed") {
            return current;
          }

          if (current.status === "draft" && hasDraftRequestChanges(current)) {
            return current;
          }

          return current.status === "draft" ? current : mergeRequestWithDefaults();
        });

        setOffers(
          shouldUseRemoteRequest && nextVisibleRequest
            ? offerRecords.filter((offer) => offer.requestId === nextVisibleRequest.id).map(stripOfferMetadata)
            : []
        );
        setRatingsState(remoteRatings);
      } catch (error) {
        if (__DEV__ && !hasLoggedFailure) {
          hasLoggedFailure = true;
          console.warn("Failed to fetch shared marketplace data from backend.", error);
        }
      }
    };

    refreshMarketplace();
    const intervalId = setInterval(refreshMarketplace, 3000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [currentAccountId, role]);

  useEffect(() => {
    if (!hasValidCoordinates(activeRequest.latitude, activeRequest.longitude)) {
      return;
    }

    setMechanics((current) =>
      current.map((mechanic) => {
        if (!hasValidCoordinates(mechanic.latitude, mechanic.longitude)) {
          return {
            ...mechanic,
            distanceKm: 0,
            etaMinutes: 0,
            isAvailable: false
          };
        }

        const nextDistanceKm = calculateDistanceKm(
          mechanic.latitude,
          mechanic.longitude,
          activeRequest.latitude,
          activeRequest.longitude
        );

        return {
          ...mechanic,
          distanceKm: Number(nextDistanceKm.toFixed(1)),
          etaMinutes: estimateEtaMinutes(nextDistanceKm),
          isAvailable: true
        };
      })
    );
  }, [activeRequest.latitude, activeRequest.longitude]);

  useEffect(() => {
    if (!activeRequest.assignedMechanicId || !["accepted", "arriving"].includes(activeRequest.status)) {
      return;
    }

    const intervalId = setInterval(() => {
      setMechanics((current) =>
        current.map((mechanic) => {
          if (mechanic.id !== activeRequest.assignedMechanicId) {
            return mechanic;
          }

          const latitudeDelta = activeRequest.latitude - mechanic.latitude;
          const longitudeDelta = activeRequest.longitude - mechanic.longitude;
          const nextLatitude = Math.abs(latitudeDelta) < 0.00012 ? activeRequest.latitude : mechanic.latitude + latitudeDelta * 0.18;
          const nextLongitude =
            Math.abs(longitudeDelta) < 0.00012 ? activeRequest.longitude : mechanic.longitude + longitudeDelta * 0.18;
          const nextDistanceKm = calculateDistanceKm(nextLatitude, nextLongitude, activeRequest.latitude, activeRequest.longitude);

          return {
            ...mechanic,
            latitude: nextLatitude,
            longitude: nextLongitude,
            distanceKm: Number(nextDistanceKm.toFixed(1)),
            etaMinutes: estimateEtaMinutes(nextDistanceKm)
          };
        })
      );
    }, 3500);

    return () => {
      clearInterval(intervalId);
    };
  }, [activeRequest.assignedMechanicId, activeRequest.latitude, activeRequest.longitude, activeRequest.status]);

  useEffect(() => {
    if (!isAuthenticated || !currentAccountId || !accountLiveLocation) {
      return;
    }

    const accountLabel =
      role === "mechanic"
        ? registeredAccounts.find((account) => account.id === currentAccountId)?.mechanicCredentials?.garageLocation
        : activeRequestRef.current.locationLabel;
    const signature = `${currentAccountId}:${accountLiveLocation.latitude.toFixed(5)}:${accountLiveLocation.longitude.toFixed(5)}`;

    if (lastPublishedAccountLocationRef.current === signature) {
      return;
    }

    lastPublishedAccountLocationRef.current = signature;

    if (role === "mechanic" && currentMechanicId) {
      setMechanics((current) =>
        current.map((mechanic) =>
          mechanic.id === currentMechanicId
            ? {
                ...mechanic,
                latitude: accountLiveLocation.latitude,
                longitude: accountLiveLocation.longitude
              }
            : mechanic
        )
      );
    }

    setRegisteredAccounts((current) =>
      current.map((account) =>
        account.id === currentAccountId
          ? {
              ...account,
              lastKnownLocation: {
                latitude: accountLiveLocation.latitude,
                longitude: accountLiveLocation.longitude,
                label: accountLabel,
                updatedAt: new Date().toISOString()
              }
            }
          : account
      )
    );

    if (
      role === "driver" &&
      activeRequestRef.current.id &&
      activeRequestRef.current.status !== "draft" &&
      activeRequestRef.current.status !== "completed" &&
      activeRequestRef.current.requestedByAccountId === currentAccountId
    ) {
      const requestSignature = `${activeRequestRef.current.id}:${accountLiveLocation.latitude.toFixed(5)}:${accountLiveLocation.longitude.toFixed(5)}`;

      if (lastPublishedDriverRequestLocationRef.current !== requestSignature) {
        lastPublishedDriverRequestLocationRef.current = requestSignature;

        setActiveRequest((current) =>
          current.requestedByAccountId === currentAccountId
            ? {
                ...current,
                latitude: accountLiveLocation.latitude,
                longitude: accountLiveLocation.longitude
              }
            : current
        );
        setOpenServiceRequests((current) =>
          current.map((request) =>
            request.id === activeRequestRef.current.id
              ? {
                  ...request,
                  latitude: accountLiveLocation.latitude,
                  longitude: accountLiveLocation.longitude
                }
              : request
          )
        );

        void updateServiceRequestRecord(activeRequestRef.current.id, {
          latitude: accountLiveLocation.latitude,
          longitude: accountLiveLocation.longitude
        }).catch((error) => {
          if (__DEV__) {
            console.warn("Failed to sync driver live request location.", error);
          }
        });
      }
    }

    void updateAccountLocation(currentAccountId, {
      latitude: accountLiveLocation.latitude,
      longitude: accountLiveLocation.longitude,
      label: accountLabel
    }).catch((error) => {
      if (__DEV__) {
        console.warn(`Failed to publish ${role} live location.`, error);
      }
    });
  }, [accountLiveLocation, currentAccountId, currentMechanicId, isAuthenticated, registeredAccounts, role]);

  useEffect(() => {
    if (!isAuthenticated || role !== "mechanic") {
      hasPreparedMechanicNotificationsRef.current = false;
      return;
    }

    if (hasPreparedMechanicNotificationsRef.current) {
      return;
    }

    hasPreparedMechanicNotificationsRef.current = true;

    void prepareLocalNotifications().catch((error) => {
      if (__DEV__) {
        console.warn("Failed to prepare local notifications.", error);
      }
    });
  }, [isAuthenticated, role]);

  useEffect(() => {
    const currentRequestIds = openServiceRequests.map((request) => request.id);
    const latestOpenRequest = openServiceRequests[0];

    if (!isAuthenticated || role !== "mechanic") {
      previousOpenRequestIdsRef.current = currentRequestIds;
      hasHydratedMechanicRequestsRef.current = false;
      dismissedMechanicNotificationRequestIdRef.current = undefined;
      setMechanicNotification(undefined);
      return;
    }

    if (!hasHydratedMechanicRequestsRef.current) {
      hasHydratedMechanicRequestsRef.current = true;
      previousOpenRequestIdsRef.current = currentRequestIds;
      setMechanicNotification(
        latestOpenRequest && latestOpenRequest.id !== dismissedMechanicNotificationRequestIdRef.current
          ? buildMechanicNotification(latestOpenRequest, openServiceRequests.length)
          : undefined
      );
      return;
    }

    const previousRequestIds = previousOpenRequestIdsRef.current;
    const newRequests = openServiceRequests.filter((request) => !previousRequestIds.includes(request.id));

    if (newRequests.length) {
      const newestRequest = newRequests[0];
      const nextNotification = buildMechanicNotification(newestRequest, openServiceRequests.length);

      setMechanicNotification(nextNotification);
      dismissedMechanicNotificationRequestIdRef.current = undefined;
      Vibration.vibrate(260);
      Alert.alert(nextNotification.title, nextNotification.message);
      void sendLiveRequestPanelNotification(nextNotification.title, nextNotification.message, nextNotification.requestId).catch((error) => {
        if (__DEV__) {
          console.warn("Failed to show phone notification panel alert.", error);
        }
      });
    } else {
      setMechanicNotification((current) => {
        if (current && currentRequestIds.includes(current.requestId)) {
          return current;
        }

        if (latestOpenRequest && latestOpenRequest.id !== dismissedMechanicNotificationRequestIdRef.current) {
          return buildMechanicNotification(latestOpenRequest, openServiceRequests.length);
        }

        return undefined;
      });
    }

    previousOpenRequestIdsRef.current = currentRequestIds;
  }, [isAuthenticated, openServiceRequests, role]);

  const applySession = (account: RegisteredAccount) => {
    const resolvedMechanicId = account.role === "mechanic" ? resolveMechanicIdForAccount(account, mechanics) : undefined;

    setUserProfile(account.profile);
    setRole(account.role);
    setMechanicCredentials(account.role === "mechanic" ? account.mechanicCredentials : undefined);
    setCurrentMechanicId(resolvedMechanicId);
    setCurrentAccountId(account.id);
    setIsAuthenticated(true);
  };

  const value = useMemo<AppContextValue>(
    () => ({
      isAuthenticated,
      userName: userProfile.fullName,
      role,
      userProfile,
      registeredAccounts,
      pendingApprovalAccount,
      mechanicCredentials,
      currentMechanic,
      mechanics: mechanicsWithRatings,
      offers,
      ratings: ratingsState,
      paymentMethods: defaultPaymentMethods,
      activeRequest,
      openServiceRequests,
      mechanicNotification,
      mapSource,
      unreadJobMessageCount,
      signUp: async (profile, nextRole, password, credentials) => {
        try {
          const result = await signUpAccount({
            profile: {
              fullName: profile.fullName.trim(),
              email: profile.email.trim(),
              phone: profile.phone.trim(),
              profilePhoto: profile.profilePhoto
            },
            role: nextRole,
            password,
            credentials
          });

          const account = result.account;

          if (account) {
            setRegisteredAccounts((current) => {
              const withoutExisting = current.filter((item) => item.id !== account.id);
              return [...withoutExisting, account];
            });
            syncApprovedMechanics([account]);
          }

          if (result.success && account && nextRole === "driver") {
            applySession(account);
          }

          if (result.success && account && nextRole === "mechanic") {
            setPendingApprovalAccount(account);
          }

          return {
            success: result.success,
            message: result.message
          };
        } catch (error) {
          return {
            success: false,
            message: "Could not reach the shared signup server. Start the admin server first."
          };
        }
      },
      login: async (email, password) => {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPassword = password.trim();

        try {
          const result = await loginAccount(email.trim(), normalizedPassword);
          let account = result.account;

          if (result.success && !account) {
            const latestAccounts = await fetchRegisteredAccounts();
            setRegisteredAccounts(latestAccounts);
            syncApprovedMechanics(latestAccounts);

            account =
              latestAccounts.find((item) => item.id === result.user?.id) ||
              latestAccounts.find((item) => item.profile.email.toLowerCase() === normalizedEmail);
          }

          if (result.success && account) {
            setRegisteredAccounts((current) => {
              const withoutExisting = current.filter((item) => item.id !== account.id);
              return [...withoutExisting, account];
            });
            syncApprovedMechanics([account]);
            applySession(account);
          }

          if (result.success && !account) {
            return {
              success: false,
              message: "Login succeeded but account details could not be loaded. Please try again."
            };
          }

          if (!result.success) {
            const pendingMechanic = registeredAccounts.find(
              (account) =>
                account.role === "mechanic" &&
                account.approvalStatus === "pending" &&
                account.profile.email.toLowerCase() === normalizedEmail
            );

            if (pendingMechanic) {
              setPendingApprovalAccount(pendingMechanic);
            }
          }

          return {
            success: result.success,
            message: result.message
          };
        } catch (error) {
          const pendingMechanic = registeredAccounts.find(
            (account) =>
              account.role === "mechanic" &&
              account.approvalStatus === "pending" &&
              account.profile.email.toLowerCase() === normalizedEmail
          );

          if (pendingMechanic) {
            setPendingApprovalAccount(pendingMechanic);
          }

          if (__DEV__) {
            console.error("Login error:", error);
          }

          if (error instanceof Error) {
            const lowerMessage = error.message.toLowerCase();
            const isNetworkError =
              lowerMessage.includes("network request failed") ||
              lowerMessage.includes("failed to fetch") ||
              lowerMessage.includes("networkerror");

            return {
              success: false,
              message: isNetworkError
                ? "Could not reach the backend server. Please confirm it is running and reachable from your device."
                : error.message
            };
          }

          return {
            success: false,
            message: "Login failed. Please check your credentials or ensure the backend server is running."
          };
        }
      },
      approveMechanicAccount: async (accountId) => {
        try {
          const result = await approveMechanicAccountRequest(accountId);

          if (!result.account) {
            return;
          }

          const approvedAccount = result.account;

          setRegisteredAccounts((current) =>
            current.map((account) => (account.id === approvedAccount.id ? approvedAccount : account))
          );
          syncApprovedMechanics([approvedAccount]);
        } catch (error) {
          if (__DEV__) {
            console.warn("Failed to approve mechanic account from server.", error);
          }
        }
      },
      signOut: () => {
        setIsAuthenticated(false);
        setUserProfile({
          fullName: "",
          email: "",
          phone: ""
        });
        setRole("driver");
        setMechanicCredentials(undefined);
        setCurrentMechanicId(undefined);
        setCurrentAccountId(undefined);
        setPendingApprovalAccount(undefined);
        setOffers([]);
        setOpenServiceRequests([]);
        setMechanicNotification(undefined);
        setActiveRequest(createEmptyServiceRequest());
        lastPublishedAccountLocationRef.current = "";
        lastPublishedDriverRequestLocationRef.current = "";
        previousOpenRequestIdsRef.current = [];
        hasHydratedMechanicRequestsRef.current = false;
        dismissedMechanicNotificationRequestIdRef.current = undefined;
      },
      clearPendingApproval: () => {
        setPendingApprovalAccount(undefined);
      },
      updateRequest: (updates) =>
        setActiveRequest((current) => ({
          ...current,
          ...updates
        })),
      submitRequest: (overrides) => {
        const nextRequest = {
          ...activeRequest,
          ...overrides,
          requestedByAccountId: currentAccountId,
          videoRoomId:
            activeRequest.videoRoomId ??
            `FixNow-${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 12)}`,
          status: "reviewing" as const
        };

        setActiveRequest(nextRequest);
        setOffers([]);

        void (async () => {
          try {
            const requestResult = await createServiceRequestRecord(nextRequest);
            const savedRequest = requestResult.serviceRequest ? mergeRequestWithDefaults(requestResult.serviceRequest) : nextRequest;

            setActiveRequest(savedRequest);
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to create service request on backend.", error);
            }
          }
        })();
      },
      selectOffer: (offerId) => {
        const selectedOffer = offers.find((offer) => offer.id === offerId);

        if (!selectedOffer) {
          return;
        }

        setOffers((current) =>
          current.map((offer) => ({
            ...offer,
            status: offer.id === offerId ? "accepted" : "declined"
          }))
        );
        setActiveRequest((current) => ({
          ...current,
          assignedMechanicId: selectedOffer.mechanicId,
          selectedOfferId: selectedOffer.id,
          agreedPrice: selectedOffer.price,
          status: "accepted"
        }));

        void (async () => {
          try {
            await Promise.all(
              offers.map((offer) =>
                updateOfferRecord(offer.id, {
                  status: offer.id === offerId ? "accepted" : "declined"
                })
              )
            );

            await updateServiceRequestRecord(activeRequest.id, {
              assignedMechanicId: selectedOffer.mechanicId,
              selectedOfferId: selectedOffer.id,
              agreedPrice: selectedOffer.price,
              status: "accepted"
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to sync selected offer with backend.", error);
            }
          }
        })();
      },
      sendMechanicOffer: (mechanicId, price, transportType) => {
        const mechanic = mechanicsWithRatings.find((item) => item.id === mechanicId);

        if (!mechanic) {
          return;
        }

        const normalizedPrice = price.trim() || mechanic.serviceFee || "$0";
        const nextEta = estimateTransportEtaMinutes(mechanic.distanceKm, transportType);
        const basePriceLabel = normalizedPrice.startsWith("$") ? normalizedPrice : `$${normalizedPrice}`;
        const pricing = addPercentageCharge(basePriceLabel, 0.06);
        const transportLabel = getTransportLabel(transportType);

        setMechanics((current) =>
          current.map((item) =>
            item.id === mechanicId
              ? {
                  ...item,
                  etaMinutes: nextEta
                }
              : item
          )
        );

        setOffers((current) => {
          const existing = current.find((offer) => offer.mechanicId === mechanicId);
          const nextOffer: MechanicOffer = {
            id: existing?.id ?? `offer-${mechanicId}`,
            mechanicId,
            transportType,
            price: pricing.totalPrice,
            basePrice: pricing.basePrice,
            surcharge: pricing.surcharge,
            etaMinutes: nextEta,
            distanceKm: mechanic.distanceKm,
            message: `${mechanic.name} is coming by ${transportLabel.toLowerCase()} and can arrive in about ${nextEta} min. Driver total includes 6% system charge.`,
            status: existing?.status === "accepted" ? "accepted" : "pending"
          };

          if (!existing) {
            return [...current, nextOffer];
          }

          return current.map((offer) => (offer.mechanicId === mechanicId ? nextOffer : offer));
        });
        setActiveRequest((current) => ({
          ...current,
          status: current.status === "draft" ? "reviewing" : current.status
        }));

        void (async () => {
          try {
            if (activeRequest.status === "draft") {
              return;
            }

            const existing = offers.find((offer) => offer.mechanicId === mechanicId);
            const hasPersistedOffer = Boolean(existing && !existing.id.startsWith("offer-"));
            const offerPayload: MechanicOffer = {
              id: existing?.id ?? `offer-${mechanicId}`,
              mechanicId,
              transportType,
              price: pricing.totalPrice,
              basePrice: pricing.basePrice,
              surcharge: pricing.surcharge,
              etaMinutes: nextEta,
              distanceKm: mechanic.distanceKm,
              message: `${mechanic.name} is coming by ${transportLabel.toLowerCase()} and can arrive in about ${nextEta} min. Driver total includes 6% system charge.`,
              status: existing?.status === "accepted" ? "accepted" : "pending"
            };

            const result = hasPersistedOffer && existing
              ? await updateOfferRecord(existing.id, offerPayload)
              : await createOfferRecord({
                  ...offerPayload,
                  requestId: activeRequest.id
                });

            if (result.offer) {
              const syncedOffer = stripOfferMetadata(result.offer);

              setOffers((current) => {
                const offersForOtherMechanics = current.filter(
                  (offer) => offer.mechanicId !== syncedOffer.mechanicId
                );

                return [...offersForOtherMechanics, syncedOffer];
              });
            }

            await updateServiceRequestRecord(activeRequest.id, {
              status: activeRequest.status
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to sync mechanic offer with backend.", error);
            }
          }
        })();
      },
      sendJobMessage: (text, photoUri) => {
        const trimmedText = text.trim();

        if (!trimmedText && !photoUri) {
          return;
        }

        const message: JobMessage = {
          id: `message-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          senderRole: role,
          senderName: userProfile.fullName || (role === "mechanic" ? "Mechanic" : "Driver"),
          text: trimmedText,
          photoUri,
          createdAt: new Date().toISOString()
        };
        const nextMessages = [...(activeRequest.messages ?? []), message];

        setActiveRequest((current) => ({ ...current, messages: nextMessages }));
        setOpenServiceRequests((current) =>
          current.map((request) => (request.id === activeRequest.id ? { ...request, messages: nextMessages } : request))
        );

        if (activeRequest.status !== "draft") {
          void updateServiceRequestRecord(activeRequest.id, { messages: nextMessages }).catch((error) => {
            if (__DEV__) {
              console.warn("Failed to sync job message with backend.", error);
            }
          });
        }
      },
      markJobMessagesRead: () => {
        const receivedMessageIds = (activeRequest.messages ?? [])
          .filter((message) => message.senderRole !== role)
          .map((message) => message.id);

        if (!receivedMessageIds.length) return;
        setReadJobMessageIds((current) => {
          if (receivedMessageIds.every((messageId) => current.has(messageId))) return current;
          return new Set([...current, ...receivedMessageIds]);
        });
      },
      completeServiceWithCost: (repairCost) => {
        const baseRepairCost = parseCurrency(repairCost);

        if (baseRepairCost <= 0) {
          return;
        }

        const platformFee = baseRepairCost * 0.07;
        const totalPaymentDue = baseRepairCost + platformFee;

        setActiveRequest((current) => ({
          ...current,
          repairCost: formatCurrency(baseRepairCost),
          platformFee: formatCurrency(platformFee),
          totalPaymentDue: formatCurrency(totalPaymentDue),
          status: "completed"
        }));

        void (async () => {
          try {
            if (!activeRequest.id) {
              return;
            }

            const repairCostValue = formatCurrency(baseRepairCost);
            const platformFeeValue = formatCurrency(platformFee);
            const totalPaymentDueValue = formatCurrency(totalPaymentDue);

            await createPaymentRecord({
              requestId: activeRequest.id,
              mechanicId: activeRequest.assignedMechanicId,
              repairCost: repairCostValue,
              status: "pending"
            });

            await updateServiceRequestRecord(activeRequest.id, {
              repairCost: repairCostValue,
              platformFee: platformFeeValue,
              totalPaymentDue: totalPaymentDueValue,
              status: "completed"
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to sync payment summary with backend.", error);
            }
          }
        })();
      },
      submitMechanicRating: (score, comment) => {
        if (!activeRequest.assignedMechanicId || activeRequest.status !== "completed") {
          return;
        }

        const assignedMechanic = mechanicsWithRatings.find((mechanic) => mechanic.id === activeRequest.assignedMechanicId);

        if (!assignedMechanic) {
          return;
        }

        const normalizedScore = Math.max(1, Math.min(5, Math.round(score)));
        const nextComment = comment?.trim() || `Driver rated the service ${normalizedScore}/5.`;

        setRatingsState((current) => [
          {
            id: `r-${Date.now()}`,
            mechanicId: assignedMechanic.id,
            mechanicName: assignedMechanic.name,
            score: normalizedScore,
            comment: nextComment,
            date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
          },
          ...current
        ]);

        void (async () => {
          try {
            await createRatingRecord({
              mechanicId: assignedMechanic.id,
              mechanicName: assignedMechanic.name,
              score: normalizedScore,
              comment: nextComment,
              date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to sync rating with backend.", error);
            }
          }
        })();
      },
      advanceRequestStatus: () => {
        const nextStatus =
          activeRequest.status === "accepted"
            ? "arriving"
            : activeRequest.status === "arriving"
              ? "completed"
              : activeRequest.status;

        setActiveRequest((current) => ({
          ...current,
          status: nextStatus
        }));

        void (async () => {
          try {
            await updateServiceRequestRecord(activeRequest.id, {
              status: nextStatus
            });
          } catch (error) {
            if (__DEV__) {
              console.warn("Failed to sync request status with backend.", error);
            }
          }
        })();
      },
      resetRequest: () => {
        setOffers([]);
        setActiveRequest(createEmptyServiceRequest());
        lastPublishedDriverRequestLocationRef.current = "";
      },
      setMapSource,
      updateMechanicTransportMode: (transportMode) => {
        if (role !== "mechanic" || !currentAccountId) {
          return;
        }

        const activeMechanicId = currentMechanicId;
        const selectedMechanic = activeMechanicId
          ? mechanicsWithRatings.find((mechanic) => mechanic.id === activeMechanicId)
          : undefined;
        const nextEta =
          selectedMechanic && selectedMechanic.distanceKm > 0
            ? estimateTransportEtaMinutes(selectedMechanic.distanceKm, transportMode)
            : selectedMechanic?.etaMinutes;
        const transportLabel = getTransportLabel(transportMode);
        const nextMessage =
          selectedMechanic && typeof nextEta === "number"
            ? `${selectedMechanic.name} is coming by ${transportLabel.toLowerCase()} and can arrive in about ${nextEta} min. Driver total includes 6% system charge.`
            : undefined;
        const existingOffer = activeMechanicId ? offers.find((offer) => offer.mechanicId === activeMechanicId) : undefined;

        setMechanicCredentials((current) =>
          current
            ? {
                ...current,
                transportMode
              }
            : current
        );
        setRegisteredAccounts((current) =>
          current.map((account) =>
            account.id === currentAccountId && account.mechanicCredentials
              ? {
                  ...account,
                  mechanicCredentials: {
                    ...account.mechanicCredentials,
                    transportMode
                  }
                }
              : account
          )
        );

        if (activeMechanicId && typeof nextEta === "number") {
          setMechanics((current) =>
            current.map((mechanic) =>
              mechanic.id === activeMechanicId
                ? {
                    ...mechanic,
                    etaMinutes: nextEta
                  }
                : mechanic
            )
          );
        }

        if (activeMechanicId) {
          setOffers((current) =>
            current.map((offer) =>
              offer.mechanicId === activeMechanicId
                ? {
                    ...offer,
                    transportType: transportMode,
                    etaMinutes: typeof nextEta === "number" ? nextEta : offer.etaMinutes,
                    message: nextMessage ?? offer.message
                  }
                : offer
            )
          );
        }

        void persistAccountTransportMode(currentAccountId, transportMode).catch((error) => {
          if (__DEV__) {
            if (error instanceof Error && error.message.includes("404")) {
              console.warn("Failed to sync mechanic transport mode. Restart the backend so the new /transport route is available.", error);
            } else {
              console.warn("Failed to sync mechanic transport mode.", error);
            }
          }
        });

        if (existingOffer?.id) {
          void updateOfferRecord(existingOffer.id, {
            transportType: transportMode,
            etaMinutes: typeof nextEta === "number" ? nextEta : existingOffer.etaMinutes,
            message: nextMessage ?? existingOffer.message
          }).catch((error) => {
            if (__DEV__) {
              console.warn("Failed to sync offer transport mode.", error);
            }
          });
        }
      },
      dismissMechanicNotification: () => {
        dismissedMechanicNotificationRequestIdRef.current = mechanicNotification?.requestId;
        setMechanicNotification(undefined);
      }
    }),
    [
      activeRequest,
      currentMechanic,
      isAuthenticated,
      mapSource,
      mechanicCredentials,
      mechanics,
      mechanicsWithRatings,
      mechanicNotification,
      openServiceRequests,
      offers,
      ratingsState,
      readJobMessageIds,
      registeredAccounts,
      pendingApprovalAccount,
      role,
      unreadJobMessageCount,
      userProfile
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
