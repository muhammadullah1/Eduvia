import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer"

import type { DocColumn, PrintableDocument } from "./document-model"
import { formatDocDate } from "./document-model"

const BRAND = "#047857"
const BRAND_DEEP = "#064E3B"
const BRAND_WASH = "#ECFDF5"
const BRAND_LINE = "#A7F3D0"
const INK = "#0F172A"
const MUTED = "#64748B"
const LINE = "#E2E8F0"

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 64,
    paddingHorizontal: 32,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: INK,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: BRAND,
  },
  logo: { width: 46, height: 46, marginRight: 12 },
  school: { fontSize: 16, fontFamily: "Helvetica-Bold", color: BRAND_DEEP },
  tagline: { fontSize: 8, color: MUTED, marginTop: 2 },
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 10,
  },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", color: INK, letterSpacing: 0.4 },
  provisional: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#B45309",
    borderWidth: 1,
    borderColor: "#FCD34D",
    backgroundColor: "#FFFBEB",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 3,
  },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: BRAND_LINE,
    backgroundColor: BRAND_WASH,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 12,
  },
  fact: { width: "25%", paddingVertical: 3, paddingRight: 6 },
  factLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", letterSpacing: 0.4 },
  factValue: { fontSize: 9, fontFamily: "Helvetica-Bold", marginTop: 1 },
  section: { marginBottom: 12 },
  heading: { fontSize: 10, fontFamily: "Helvetica-Bold", color: BRAND_DEEP, marginBottom: 4 },
  caption: { fontSize: 7.5, color: MUTED, marginTop: 3 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 3 },
  headRow: { flexDirection: "row", backgroundColor: BRAND },
  headCell: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: "#FFFFFF",
  },
  row: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE },
  rowAlt: { backgroundColor: "#F8FAFC" },
  cell: { paddingVertical: 4, paddingHorizontal: 4, fontSize: 8.5 },
  summary: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: BRAND,
    borderRadius: 4,
    marginBottom: 8,
  },
  summaryItem: { flex: 1, paddingVertical: 6, paddingHorizontal: 8, borderRightWidth: 1, borderRightColor: BRAND_LINE },
  summaryValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: BRAND_DEEP, marginTop: 2 },
  signatures: { flexDirection: "row", justifyContent: "space-between", marginTop: 44 },
  signature: { width: "28%", borderTopWidth: 1, borderTopColor: INK, paddingTop: 4, alignItems: "center" },
  signatureLabel: { fontSize: 8, color: MUTED },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 32,
    right: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: LINE,
    paddingTop: 6,
    fontSize: 7.5,
    color: MUTED,
  },
})

function cellStyle(column: DocColumn) {
  return {
    flex: column.flex ?? 1,
    textAlign: column.align ?? "left",
  } as const
}

export function ExamDocumentPdf({ doc, logo }: { doc: PrintableDocument; logo: string }) {
  return (
    <Document title={`${doc.title} · ${doc.schoolName}`} author={doc.schoolName}>
      <Page size="A4" orientation={doc.landscape ? "landscape" : "portrait"} style={styles.page}>
        <View style={styles.header} fixed>
          <Image src={logo} style={styles.logo} />
          <View>
            <Text style={styles.school}>{doc.schoolName}</Text>
            <Text style={styles.tagline}>Examination department</Text>
          </View>
        </View>

        <View style={styles.titleBar}>
          <Text style={styles.title}>{doc.title.toUpperCase()}</Text>
          {doc.provisional ? <Text style={styles.provisional}>PROVISIONAL · NOT YET PUBLISHED</Text> : null}
        </View>

        <View style={styles.facts}>
          {doc.facts.map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.factValue}>{fact.value}</Text>
            </View>
          ))}
        </View>

        {doc.tables.map((table, index) => (
          <View key={table.heading ?? index} style={styles.section}>
            {table.heading ? <Text style={styles.heading} minPresenceAhead={40}>{table.heading}</Text> : null}
            <View style={styles.table}>
              <View style={styles.headRow} fixed>
                {table.columns.map((column) => (
                  <Text key={column.key} style={[styles.headCell, cellStyle(column)]}>
                    {column.label}
                  </Text>
                ))}
              </View>
              {table.rows.length ? (
                table.rows.map((row, rowIndex) => (
                  <View key={rowIndex} style={rowIndex % 2 ? [styles.row, styles.rowAlt] : styles.row} wrap={false}>
                    {table.columns.map((column) => (
                      <Text key={column.key} style={[styles.cell, cellStyle(column)]}>
                        {row[column.key] ?? ""}
                      </Text>
                    ))}
                  </View>
                ))
              ) : (
                <Text style={[styles.cell, { color: MUTED }]}>No students on this sheet yet.</Text>
              )}
            </View>
            {table.caption ? <Text style={styles.caption}>{table.caption}</Text> : null}
          </View>
        ))}

        {doc.summary.length ? (
          <View style={styles.summary} wrap={false}>
            {doc.summary.map((fact) => (
              <View key={fact.label} style={styles.summaryItem}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.summaryValue}>{fact.value}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.signatures} wrap={false}>
          {doc.signatures.map((label) => (
            <View key={label} style={styles.signature}>
              <Text style={styles.signatureLabel}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>
            {doc.schoolName} · Generated {formatDocDate(doc.generatedAt)}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
