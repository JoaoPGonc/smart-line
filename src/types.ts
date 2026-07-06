export enum ScreenId {
  Login = 1,
  WhoWeAre = 2,
  Schedule = 3,
  ScheduleConfirmed = 4,
  ViewRouteMap = 6,
  RouteOverview = 7,
  ActiveRoute = 8,
  TransitCenter = 9,
  EmitAlert = 10,
  AlertSuccess = 11,
  MyAccount = 12,
  ForgotPassword = 13,
  Register = 14,
  TermsOfUse = 15,
  Ports = 16,
}

export interface Appointment {
  origin: string;
  destination: string;
  date: string;
  departureDate?: string; // Derived from calculating the schedule
  arrivalDate?: string; // The user's provided target arrival date
  time: string; // Suggested departure time
  estimatedDuration: string; // e.g. "4h 35m"
  estimatedArrival: string; // Desired/estimated arrival time
  portQueueTime: string; // e.g. "1h 45m"
  savingsMinutes: number; // e.g. 40
  status: "pending" | "confirmed";
  portAppointmentId?: string;
  driverNeeds?: {
    stopIntervalHours: number;
    requiresShower: boolean;
    requiresMeal: boolean;
    requiresSecurity: boolean;
    requiresScale: boolean;
  };
  customStops?: Array<{
    id: string;
    title: string;
    desc: string;
    time: string;
    lat: number;
    lng: number;
  }>;
}

export interface TrafficAlert {
  id: string;
  type: "accident" | "congestion" | "maintenance" | "blocked" | "other";
  title: string;
  description: string;
  timeAgo: string; // e.g. "12 MIN"
  location: string; // e.g. "BR-101, Km 242"
  severity: "high" | "medium" | "low";
}

export interface SupportItem {
  id: string;
  title: string;
  content: string;
}
