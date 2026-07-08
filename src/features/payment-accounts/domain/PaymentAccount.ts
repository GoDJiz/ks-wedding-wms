export type PaymentAccount = {
  id: string;
  name: string;
  type: "bank" | "cash";
  owner: "bride" | "groom" | "joint" | null;
  createdAt: string;
};
