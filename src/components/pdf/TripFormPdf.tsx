import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 8, padding: 28, color: "#111" },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10, paddingBottom: 6, borderBottom: "1pt solid #999" },
  headerTitle: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  headerRef: { fontSize: 8, color: "#555" },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 8.5, marginTop: 8, marginBottom: 3, backgroundColor: "#e8edf5", padding: "3pt 4pt" },
  row: { flexDirection: "row", marginBottom: 3 },
  field: { flex: 1 },
  fieldLabel: { color: "#666", marginBottom: 1 },
  fieldValue: { fontFamily: "Helvetica-Bold" },
  table: { marginTop: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: "#e8edf5", borderTop: "0.5pt solid #bbb", borderLeft: "0.5pt solid #bbb" },
  tableRow: { flexDirection: "row", borderTop: "0.5pt solid #bbb", borderLeft: "0.5pt solid #bbb" },
  cell: { padding: "2pt 3pt", borderRight: "0.5pt solid #bbb", borderBottom: "0.5pt solid #bbb" },
  cellHdr: { fontFamily: "Helvetica-Bold", padding: "2pt 3pt", borderRight: "0.5pt solid #bbb", borderBottom: "0.5pt solid #bbb" },
  totalRow: { flexDirection: "row", backgroundColor: "#f5f5f5", borderLeft: "0.5pt solid #bbb" },
  approvalBlock: { flexDirection: "row", marginTop: 10, borderTop: "0.5pt solid #bbb", paddingTop: 8 },
  approvalSlot: { flex: 1, borderRight: "0.5pt solid #bbb", padding: "0 8pt", lastChild: {} },
  note: { fontSize: 7, color: "#666", marginTop: 3, fontStyle: "italic" },
});

function formatD(d: any) { if (!d) return "—"; return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
function fmtNum(n: any) { if (n == null || n === "" || Number(n) === 0) return "—"; return Number(n).toFixed(2); }

const COL_WIDTHS = { num: "4%", type: "14%", date: "10%", details: "28%", local: "15%", fx: "12%", thb: "17%" };

function ExpenseTable({ lines, label }: { lines: any[]; label: string }) {
  const calcThb = (l: any) => Number(l.amountLocalFx ?? 0) * Number(l.fxRateBot ?? 0);
  const total = lines.reduce((s, l) => s + calcThb(l), 0);
  return (
    <View>
      <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 7.5, marginTop: 4, marginBottom: 2 }}>{label}</Text>
      <View style={s.table}>
        <View style={s.tableHeader}>
          {["#", "Type / Description", "Date", "Work Details", "Amt (Local Fx)", "FX Rate", "Amt (THB)"].map((h, i) => (
            <Text key={i} style={[s.cellHdr, { width: Object.values(COL_WIDTHS)[i], fontSize: 7 }]}>{h}</Text>
          ))}
        </View>
        {[0, 1, 2, 3, 4].map((i) => {
          const l = lines[i] ?? {};
          const thb = calcThb(l);
          return (
            <View key={i} style={s.tableRow}>
              <Text style={[s.cell, { width: COL_WIDTHS.num }]}>{i + 1}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.type }]}>{l.expenseType ?? ""}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.date }]}>{l.expenseDate ? formatD(l.expenseDate) : ""}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.details }]}>{l.workDetails ?? ""}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.local, textAlign: "right" }]}>{fmtNum(l.amountLocalFx)}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.fx, textAlign: "right" }]}>{fmtNum(l.fxRateBot)}</Text>
              <Text style={[s.cell, { width: COL_WIDTHS.thb, textAlign: "right" }]}>{thb > 0 ? thb.toFixed(2) : ""}</Text>
            </View>
          );
        })}
        <View style={[s.totalRow, { borderTop: "0.5pt solid #bbb" }]}>
          <Text style={[s.cell, { flex: 1, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>TOTAL (THB)</Text>
          <Text style={[s.cell, { width: COL_WIDTHS.thb, textAlign: "right", fontFamily: "Helvetica-Bold" }]}>{total > 0 ? total.toFixed(2) : "—"}</Text>
        </View>
      </View>
    </View>
  );
}

function TripPage({ form, phase, preLines, postLines, companyName }: any) {
  const isPost = phase === "POST";
  const lines = isPost ? postLines : preLines;
  const transportLines = (lines ?? []).filter((l: any) => l.section === "TRANSPORTATION");
  const otherLines = (lines ?? []).filter((l: any) => l.section === "OTHER");
  const perDiemUsd = Number(form.totalTripDays ?? 0) * Number(form.perDiemUsdPerDay ?? 0);
  const perDiemThb = perDiemUsd * Number(form.botFxRate ?? 0);

  return (
    <Page size="A4" style={s.page}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>{companyName} — OVERSEAS BUSINESS TRAVEL FORM ({phase}-TRIP)</Text>
          <Text style={s.note}>In case the travel is &gt;60 days, a separate approval is required.</Text>
        </View>
        <Text style={s.headerRef}>Ref: {form.referenceNumber}</Text>
      </View>

      {/* Section 1 */}
      <Text style={s.sectionTitle}>EMPLOYEE INFORMATION</Text>
      <View style={s.row}>
        {[["Emp. ID", form.empIdSnap], ["Name", form.empNameSnap], ["Position", form.positionSnap], ["Grade", form.gradeSnap], ["Department", form.departmentSnap], ["Division", form.divisionSnap]].map(([l, v]) => (
          <View key={l as string} style={s.field}>
            <Text style={s.fieldLabel}>{l as string}</Text>
            <Text style={s.fieldValue}>{v || "—"}</Text>
          </View>
        ))}
      </View>

      {/* Section 2 */}
      <Text style={s.sectionTitle}>TRIP&apos;S DETAIL</Text>
      <View style={s.row}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2, fontSize: 7.5 }}>Outgoing (Destination)</Text>
          {[["City", form.outCity], ["Country", form.outCountry], ["Airline", form.outAirline], ["Flight No.", form.outFlightNo], ["Departure", `${formatD(form.outDepDate)} ${form.outDepTime ?? ""}`], ["Arrival", `${formatD(form.outArrDate)} ${form.outArrTime ?? ""}`]].map(([l, v]) => (
            <View key={l as string} style={{ flexDirection: "row", marginBottom: 1 }}>
              <Text style={{ width: "35%", color: "#666" }}>{l as string}</Text>
              <Text style={{ flex: 1 }}>{v || "—"}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2, fontSize: 7.5 }}>Incoming (Return)</Text>
          {[["City", form.inCity], ["Country", form.inCountry], ["Airline", form.inAirline], ["Flight No.", form.inFlightNo], ["Departure", `${formatD(form.inDepDate)} ${form.inDepTime ?? ""}`], ["Arrival", `${formatD(form.inArrDate)} ${form.inArrTime ?? ""}`]].map(([l, v]) => (
            <View key={l as string} style={{ flexDirection: "row", marginBottom: 1 }}>
              <Text style={{ width: "35%", color: "#666" }}>{l as string}</Text>
              <Text style={{ flex: 1 }}>{v || "—"}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Section 3 */}
      <Text style={s.sectionTitle}>BUSINESS TRIP PURPOSE</Text>
      <View style={s.row}>
        <View style={s.field}><Text style={s.fieldLabel}>Purpose</Text><Text>{form.purpose || "—"}</Text></View>
        <View style={s.field}><Text style={s.fieldLabel}>Cost Charged To</Text><Text>{form.costChargedTo || "—"}</Text></View>
        <View style={s.field}><Text style={s.fieldLabel}>Cost Center</Text><Text>{form.costCenter || "—"}</Text></View>
      </View>
      <Text style={s.fieldLabel}>Objective</Text>
      <Text style={{ marginBottom: 2 }}>{form.objective || "—"}</Text>
      <Text style={s.note}>The accommodation rate is inclusive of breakfast and applicable tax(es).</Text>

      {/* Section 4 */}
      <Text style={s.sectionTitle}>{isPost ? "ACTUAL" : "ESTIMATED"} EXPENSES</Text>
      <ExpenseTable lines={transportLines} label="Transportation" />
      <ExpenseTable lines={otherLines} label="Other Expenses" />
      {isPost && <Text style={[s.note, { marginTop: 2 }]}>Valid receipt(s) required for reimbursement</Text>}

      {/* Section 5 */}
      <Text style={s.sectionTitle}>{isPost ? "ACTUAL" : "ESTIMATED"} PER DIEM (OVERNIGHT STAY ONLY)</Text>
      <View style={s.row}>
        {[["Total Days", form.totalTripDays ?? "—"], ["Area", form.costOfLivingArea || "—"], ["Rate (USD/Day)", fmtNum(form.perDiemUsdPerDay)], ["BOT FX Rate", fmtNum(form.botFxRate)], ["Total (USD)", perDiemUsd > 0 ? perDiemUsd.toFixed(2) : "—"], ["Total (THB)", perDiemThb > 0 ? perDiemThb.toFixed(2) : "—"]].map(([l, v]) => (
          <View key={l as string} style={s.field}>
            <Text style={s.fieldLabel}>{l as string}</Text>
            <Text style={s.fieldValue}>{String(v)}</Text>
          </View>
        ))}
      </View>

      {/* Section 6 — Approval */}
      <Text style={s.sectionTitle}>APPROVAL (Verified by People Partnership)</Text>
      <View style={s.approvalBlock}>
        {[
          ["Trip Requester", form.empNameSnap, isPost ? formatD(form.postSubmittedAt) : formatD(form.preSubmittedAt)],
          ["Head of Department", isPost ? form.postApproverName : form.preApproverName, isPost ? formatD(form.postApprovedAt) : formatD(form.preApprovedAt)],
          ["Head of Division", "—", "—"],
          ["President", "—", "—"],
        ].map(([role, name, date]) => (
          <View key={role as string} style={{ flex: 1, paddingHorizontal: 6, borderRight: "0.5pt solid #bbb" }}>
            <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 2 }}>{role as string}</Text>
            <Text>{name ?? "—"}</Text>
            <Text style={{ color: "#666", marginTop: 1 }}>{date as string}</Text>
          </View>
        ))}
      </View>
    </Page>
  );
}

export function TripFormPdf({ form, preLines, postLines, companyName }: { form: any; preLines: any[]; postLines: any[]; companyName: string }) {
  return (
    <Document>
      <TripPage form={form} phase="PRE" preLines={preLines} postLines={postLines} companyName={companyName} />
      <TripPage form={form} phase="POST" preLines={preLines} postLines={postLines} companyName={companyName} />
    </Document>
  );
}
