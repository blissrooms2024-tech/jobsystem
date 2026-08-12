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
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  companyBlock: { textAlign: "center", marginBottom: 16, paddingBottom: 8, borderBottomWidth: 2, borderBottomColor: "#222" },
  companyName: { fontSize: 18, fontWeight: 700, letterSpacing: 1 },
  companyLine: { fontSize: 9, color: "#555" },
  title: { fontSize: 15, fontWeight: 700, marginBottom: 2 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 12 },
  infoRow: { flexDirection: "row", marginBottom: 3 },
  infoLabel: { width: "22%", color: "#777", fontSize: 10 },
  infoValue: { fontSize: 10 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#555" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, backgroundColor: "#161a2b", padding: 10 },
  totalLabel: { fontSize: 13, fontWeight: 700, color: "#fff" },
  totalValue: { fontSize: 13, fontWeight: 700, color: "#fff" },
  words: { fontSize: 10, fontStyle: "italic", color: "#333", marginTop: 6 },
  signRow: { flexDirection: "row", marginTop: 48 },
  signBox: { width: "45%", borderTopWidth: 1, borderTopColor: "#999", paddingTop: 4, fontSize: 9, color: "#555" },
});

export type PayslipData = {
  payrollCode: string;
  employeeName: string;
  staffType: string | null;
  icPassport: string | null;
  bankName: string | null;
  bankAccount: string | null;
  periodStart: string;
  periodEnd: string;
  jobsCount: number;
  jobsPay: string;
  baseSalary: string;
  allowance: string;
  deduction: string;
  note: string | null;
  paidAt: string | null;
};

function PayslipDocument({ data }: { data: PayslipData }) {
  const net =
    Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance) - Number(data.deduction);
  const gross = Number(data.jobsPay) + Number(data.baseSalary) + Number(data.allowance);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.companyBlock}>
          <Text style={styles.companyName}>{COMPANY.name}</Text>
          <Text style={styles.companyLine}>{COMPANY.reg}</Text>
          <Text style={styles.companyLine}>{COMPANY.address}</Text>
          <Text style={styles.companyLine}>{COMPANY.contact}</Text>
        </View>

        <Text style={styles.title}>PAYSLIP</Text>
        <Text style={styles.subtitle}>
          {data.payrollCode} · {data.periodStart} to {data.periodEnd}
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>{data.employeeName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Position</Text>
          <Text style={styles.infoValue}>{data.staffType ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>IC / Passport</Text>
          <Text style={styles.infoValue}>{data.icPassport ?? "-"}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Bank</Text>
          <Text style={styles.infoValue}>
            {data.bankName ?? "-"} {data.bankAccount ? `· ${data.bankAccount}` : ""}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Jobs pay ({data.jobsCount} jobs)</Text>
          <Text>{formatMoney(data.jobsPay)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Base salary</Text>
          <Text>{formatMoney(data.baseSalary)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Allowance</Text>
          <Text>{formatMoney(data.allowance)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Gross earnings</Text>
          <Text>{formatMoney(gross)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Deduction</Text>
          <Text>-{formatMoney(data.deduction)}</Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>NET PAY</Text>
          <Text style={styles.totalValue}>{formatMoney(net)}</Text>
        </View>
        <Text style={styles.words}>{amountInWords(net)}</Text>

        {data.note ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Remarks</Text>
            <Text>{data.note}</Text>
          </View>
        ) : null}

        <Text style={{ marginTop: 12, fontSize: 9, color: "#999" }}>
          {data.paidAt ? `Paid on ${data.paidAt}` : "Draft — not yet paid"}
        </Text>

        <View style={styles.signRow}>
          <Text style={styles.signBox}>Authorised by (Employer){"\n"}{COMPANY.name}</Text>
          <View style={{ width: "10%" }} />
          <Text style={styles.signBox}>
            Received by (Employee){"\n"}
            {data.employeeName}
            {data.icPassport ? `\nIC / Passport: ${data.icPassport}` : ""}
          </Text>
        </View>

        <Text style={{ marginTop: 24, fontSize: 8, color: "#aaa", textAlign: "center" }}>
          This is a computer-generated payslip.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
