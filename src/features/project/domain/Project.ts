export type Project = {
  id: string;
  name: string;
  brideName: string | null;
  groomName: string | null;
  weddingDate: string | null; // ISO date
  venue: string | null;
  logoUrl: string | null;
  currency: string;
  defaultLanguage: "th" | "en";
  createdAt: string;
};
