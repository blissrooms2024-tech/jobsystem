import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/utils";
import { amountInWords } from "@/lib/amount-words";

const COMPANY = {
  name: "BLISS ROOMS ENTERPRISE",
  reg: "No. Pendaftaran: 202403031665 (003573307-U)",
  address: "5635, Lahar Tiang, 13200 Kepala Batas, Pulau Pinang",
  contact: "Tel: 011-3654 7863 / 012-439 2491 · blissrooms2024@gmail.com",
};

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica", color: "#222" },
  companyBlock: { textAlign: "center", marginBottom: 10, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#222" },
  companyName: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  companyLine: { fontSize: 9, color: "#555" },
  headRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 10 },
  title: { fontSize: 15, fontWeight: 700 },
  headRight: { textAlign: "right", fontSize: 9, color: "#333" },
  infoGrid: { flexDirection: "row", marginBottom: 10 },
  infoCol: { width: "50%" },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: 90, color: "#777", fontSize: 9 },
  infoValue: { fontSize: 9, fontWeight: 700 },
  table: { flexDirection: "row", borderWidth: 1, borderColor: "#ccc" },
  tableCol: { width: "50%" },
  tableColLeft: { borderRightWidth: 1, borderRightColor: "#ccc" },
  tableHeadRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#f3f3f3", borderBottomWidth: 1, borderBottomColor: "#ccc", padding: 5 },
  tableHeadText: { fontSize: 9, fontWeight: 700 },
  tableRow: { flexDirection: "row", justifyContent: "space-between", padding: 5, borderBottomWidth: 1, borderBottomColor: "#eee" },
  tableRowText: { fontSize: 9 },
  tableTotalRow: { flexDirection: "row", justifyContent: "space-between", padding: 5, backgroundColor: "#f7f7f7" },
  tableTotalText: { fontSize: 9, fontWeight: 700 },
  netRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  netLabel: { fontSize: 13, fontWeight: 700, color: "#999" },
  netValue: { fontSize: 13, fontWeight: 700, color: "#999" },
  words: { fontSize: 9, fontStyle: "italic", color: "#333", marginTop: 4 },
  paymentRow: { flexDirection: "row", alignItems: "center", marginTop: 6, fontSize: 9 },
  paymentBadge: { marginLeft: 4, borderWidth: 1, borderColor: "#999", borderRadius: 8, paddingVertical: 1, paddingHorizontal: 8, fontSize: 8 },
  divider: { borderBottomWidth: 1, borderBottomColor: "#ccc", marginTop: 24, marginBottom: 8 },
  signRow: { flexDirection: "row", justifyContent: "space-between" },
  signBox: { fontSize: 8, color: "#555" },
  signName: { fontSize: 8, fontWeight: 700 },
  footer: { marginTop: 16, fontSize: 8, color: "#999", textAlign: "center" },
});

export type PayslipData = {
  payrollCode: string;
  employeeName: string;
  staffId: string | null;
  staffType: string | null;
  icPassport: string | null;
  bankName: string | null;
  bankAccount: string | null;
  periodStart: string;
  periodEnd: string;
  periodType: string;
  issuedDate: string;
  jobsCount: number;
  jobsPay: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  note: string | null;
  status: "draft" | "paid";
  paidAt: string | null;
  generatedAt: string;
};

function EarningsDeductionsTable({ data }: { data: PayslipData }) {
  const gross = Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance);
  return (
    <View style={styles.table}>
      <View style={[styles.tableCol, styles.tableColLeft]}>
        <View style={styles.tableHeadRow}>
          <Text style={styles.tableHeadText}>Earnings</Text>
          <Text style={styles.tableHeadText}>RM</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}>Job pay ({data.jobsCount} jobs)</Text>
          <Text style={styles.tableRowText}>{formatMoney(data.jobsPay)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}>Basic salary</Text>
          <Text style={styles.tableRowText}>{formatMoney(data.baseSalary)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}>Allowance</Text>
          <Text style={styles.tableRowText}>{formatMoney(data.allowance)}</Text>
        </View>
        <View style={styles.tableTotalRow}>
          <Text style={styles.tableTotalText}>Gross Earnings</Text>
          <Text style={styles.tableTotalText}>{formatMoney(gross)}</Text>
        </View>
      </View>
      <View style={styles.tableCol}>
        <View style={styles.tableHeadRow}>
          <Text style={styles.tableHeadText}>Deductions</Text>
          <Text style={styles.tableHeadText}>RM</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}>Deduction</Text>
          <Text style={styles.tableRowText}>{formatMoney(data.deduction)}</Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}> </Text>
          <Text style={styles.tableRowText}> </Text>
        </View>
        <View style={styles.tableRow}>
          <Text style={styles.tableRowText}> </Text>
          <Text style={styles.tableRowText}> </Text>
        </View>
        <View style={styles.tableTotalRow}>
          <Text style={styles.tableTotalText}>Total Deductions</Text>
          <Text style={styles.tableTotalText}>{formatMoney(data.deduction)}</Text>
        </View>
      </View>
    </View>
  );
}

function PayslipDocument({ data }: { data: PayslipData }) {
  const net =
    Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance) - Number(data.deduction);
  const periodTypeLabel = data.periodType === "month" ? "Month" : "Custom";

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyBlock}>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyLine}>{COMPANY.reg}</Text>
          <Text style={styles.companyLine}>{COMPANY.address}</Text>
          <Text style={styles.companyLine}>{COMPANY.contact}</Text>
        </View>

        <View style={styles.headRow}>
          <Text style={styles.title}>PAYSLIP</Text>
          <View style={styles.headRight}>
            <Text>
              Pay period: {data.periodStart} – {data.periodEnd}
            </Text>
            <Text>
              Type: {periodTypeLabel}  Issued: {data.issuedDate}
            </Text>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name</Text>
              <Text style={styles.infoValue}>{data.employeeName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Staff ID</Text>
              <Text style={styles.infoValue}>{data.staffId ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bank</Text>
              <Text style={styles.infoValue}>{data.bankName ?? "-"}</Text>
            </View>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>{data.staffType ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IC / Passport</Text>
              <Text style={styles.infoValue}>{data.icPassport ?? "-"}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account No.</Text>
              <Text style={styles.infoValue}>{data.bankAccount ?? "-"}</Text>
            </View>
          </View>
        </View>

        <EarningsDeductionsTable data={data} />

        <View style={styles.netRow}>
          <Text style={styles.netLabel}>NET PAY</Text>
          <Text style={styles.netValue}>{formatMoney(net)}</Text>
        </View>
        <Text style={styles.words}>{amountInWords(net)}</Text>

        <View style={styles.paymentRow}>
          <Text>Payment:</Text>
          <Text style={styles.paymentBadge}>{data.status === "paid" ? "PAID" : "DRAFT"}</Text>
        </View>

        {data.note ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 9, color: "#777" }}>Remarks</Text>
            <Text style={{ fontSize: 9 }}>{data.note}</Text>
          </View>
        ) : null}

        <View style={styles.divider} />
        <View style={styles.signRow}>
          <View>
            <Text style={styles.signBox}>Authorised by (Employer)</Text>
            <Text style={styles.signName}>{COMPANY.name}</Text>
          </View>
          <View>
            <Text style={styles.signBox}>Received by (Employee)</Text>
            <Text style={styles.signName}>{data.employeeName}</Text>
          </View>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated payslip. Generated on {data.generatedAt}.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
