import { z } from "zod";

export const ExpenseLineSchema = z.object({
  id: z.string().optional(),
  phase: z.enum(["PRE", "POST"]),
  section: z.enum(["TRANSPORTATION", "OTHER"]),
  lineNumber: z.number().int().min(1).max(5),
  expenseType: z.string().optional(),
  expenseDate: z.string().optional(),
  workDetails: z.string().optional(),
  amountLocalFx: z.coerce.number().optional(),
  fxRateBot: z.coerce.number().optional(),
  amountThb: z.coerce.number().optional(),
});

export const PreTripSchema = z.object({
  // Trip details
  purpose: z.string().min(1, "Purpose is required"),
  objective: z.string().min(1, "Objective is required"),
  costChargedTo: z.string().optional(),
  costCenter: z.string().optional(),

  // Outgoing flight
  outCity: z.string().min(1, "Destination city is required"),
  outCountry: z.string().min(1, "Destination country is required"),
  outAirline: z.string().optional(),
  outFlightNo: z.string().optional(),
  outDepDate: z.string().min(1, "Departure date is required"),
  outDepTime: z.string().optional(),
  outArrDate: z.string().min(1, "Arrival date is required"),
  outArrTime: z.string().optional(),

  // Incoming flight
  inCity: z.string().min(1, "Return city is required"),
  inCountry: z.string().min(1, "Return country is required"),
  inAirline: z.string().optional(),
  inFlightNo: z.string().optional(),
  inDepDate: z.string().min(1, "Return departure date is required"),
  inDepTime: z.string().optional(),
  inArrDate: z.string().min(1, "Return arrival date is required"),
  inArrTime: z.string().optional(),

  // Per diem
  totalTripDays: z.coerce.number().int().min(0).optional(),
  costOfLivingArea: z.enum(["HIGHEST", "HIGH", "NORMAL", "UNSPECIFIED"]).optional(),
  botFxRate: z.coerce.number().optional(),

  // Expense lines
  expenseLines: z.array(ExpenseLineSchema).optional(),
}).refine((data) => {
  if (data.outDepDate && data.outArrDate) {
    return new Date(data.outDepDate) <= new Date(data.outArrDate);
  }
  return true;
}, { message: "Arrival must be after departure", path: ["outArrDate"] }).refine((data) => {
  if (data.inDepDate && data.inArrDate) {
    return new Date(data.inDepDate) <= new Date(data.inArrDate);
  }
  return true;
}, { message: "Return arrival must be after return departure", path: ["inArrDate"] });

export const PostTripSchema = z.object({
  totalTripDays: z.coerce.number().int().min(0).optional(),
  costOfLivingArea: z.enum(["HIGHEST", "HIGH", "NORMAL", "UNSPECIFIED"]).optional(),
  botFxRate: z.coerce.number().optional(),
  expenseLines: z.array(ExpenseLineSchema).optional(),
});

export const ApproveSchema = z.object({
  notes: z.string().optional(),
});

export const RejectSchema = z.object({
  notes: z.string().min(1, "Please provide a reason for rejection"),
});

export const UserSchema = z.object({
  email: z.string().email("Valid email required"),
  name: z.string().min(1, "Name is required"),
  empId: z.string().min(1, "Employee ID is required"),
  position: z.string().optional(),
  grade: z.string().optional(),
  department: z.string().optional(),
  division: z.string().optional(),
  role: z.enum(["EMPLOYEE", "MANAGER", "ADMIN"]),
  managerId: z.string().optional(),
});

export const PerDiemRateSchema = z.object({
  area: z.enum(["HIGHEST", "HIGH", "NORMAL", "UNSPECIFIED"]),
  usdPerDay: z.coerce.number().min(0),
});

export type PreTripFormData = z.infer<typeof PreTripSchema>;
export type PostTripFormData = z.infer<typeof PostTripSchema>;
export type ExpenseLineData = z.infer<typeof ExpenseLineSchema>;
export type UserFormData = z.infer<typeof UserSchema>;
