export type HealthStatus = "ok" | "warning" | "error" | "not_configured";

export type HealthCheck = {
  status: HealthStatus;
  detail: string;
};

export type SystemHealth = {
  supabase: HealthCheck;
  storage: HealthCheck;
  line: HealthCheck;
  guestSync: HealthCheck;
};
