import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import { formatMoney } from "@/lib/utils";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 11, fontFamily: "Helvetica" },
  title: { fontSize: 16, marginBottom: 4, fontWeight: 700 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  label: { color: "#555" },
  divider: { borderBottomWidth: 1, borderBottomColor: "#ddd", marginVertical: 10 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  totalLabel: { fontSize: 13, fontWeight: 700 },
  totalValue: { fontSize: 13, fontWeight: 700 },
});

export type PayslipData = {
  payrollCode: string;
  employeeName: string;
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

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>Bliss Rooms — Payslip</Text>
        <Text style={styles.subtitle}>
          {data.payrollCode} · {data.periodStart} to {data.periodEnd}
        </Text>

        <View style={styles.row}>
          <Text style={styles.label}>Employee</Text>
          <Text>{data.employeeName}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Jobs completed</Text>
          <Text>{data.jobsCount}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Jobs pay</Text>
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
          <Text style={styles.label}>Deduction</Text>
          <Text>-{formatMoney(data.deduction)}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Net pay</Text>
          <Text style={styles.totalValue}>{formatMoney(net)}</Text>
        </View>

        {data.note ? (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.label}>Note</Text>
            <Text>{data.note}</Text>
          </View>
        ) : null}

        <Text style={{ marginTop: 24, fontSize: 9, color: "#999" }}>
          {data.paidAt ? `Paid on ${data.paidAt}` : "Draft — not yet paid"}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  return renderToBuffer(<PayslipDocument data={data} />);
}
