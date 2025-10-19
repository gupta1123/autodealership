"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Eye,
  ExternalLink,
  FileText,
  GitCompare,
  Loader2,
  Play,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  Upload,
  Trash2,
} from "lucide-react";

// ------------------------------------------------------------
// Dummy data & types
// ------------------------------------------------------------

type FieldKey =
  | "buyerName"
  | "fatherName"
  | "pan"
  | "aadhaar"
  | "vin"
  | "engine"
  | "model"
  | "color"
  | "address"
  | "saleAmount"
  | "mvTax"
  | "invoiceDate"
  | "saleDate"
  | "insurancePolicy"
  | "insuranceStart"
  | "insuranceEnd";

type DocType =
  | "Form20"
  | "Form21"
  | "Form22"
  | "Invoice"
  | "RTO Slip"
  | "PAN"
  | "Aadhaar"
  | "Insurance"
  | "Accessories Invoice";

interface CaseDoc {
  id: string;
  type: DocType;
  title: string;
  pages: number;
  fields: Partial<Record<FieldKey, string>>;
  md: string; // OCR-to-Markdown preview
  sourceHint?: string; // e.g., filename or storage path
}

type FieldSummary = {
  canonical: string;
  values: Record<DocType, string>;
  mismatchingDocs: DocType[];
};

type FieldMismatch = {
  field: FieldKey;
  label: string;
  canonical: string;
  mismatchingDocs: DocType[];
};

type QueuedUpload = {
  id: string;
  name: string;
  file?: File;
};

const DUMMY_DOCS: CaseDoc[] = [
  {
    id: "doc_inv",
    type: "Invoice",
    title: "Vehicle Tax Invoice — UNICORN (Pearl Igneous Black)",
    pages: 1,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
      fatherName: "Kalim Ahmed Khan Durrani",
      pan: "CPBPD4502G",
      vin: "ME4KC407JSA102577",
      engine: "KC40EA4102672",
      model: "Honda UNICORN",
      color: "Pearl Igneous Black",
      saleAmount: "₹1,10,501",
      invoiceDate: "2025-10-03",
      address: "Sadaf Colony, Kat Kat Gate, Chhatrapati Sambhajinagar",
    },
    md: `# Tax Invoice (Dealer)\n\n**Buyer**: Aasim Abbas Khan Durrani (S/W/D: Kalim Ahmed Khan Durrani)\\\n**Model**: UNICORN (Honda) — *Pearl Igneous Black*\\\n**VIN**: ME4KC407JSA102577\\\n**Engine**: KC40EA4102672\\\n**Total**: ₹1,10,501\\\n**Invoice Date**: 03-Oct-2025\\\n**Address**: Sadaf Colony, Kat Kat Gate, CSN\n\n---\n\nLine Items (GST): ...`,
    sourceHint: "Image_002.pdf",
  },
  {
    id: "doc_form21",
    type: "Form21",
    title: "Form 21 — Sale Certificate",
    pages: 1,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
      fatherName: "Kalim Ahmed Khan Durrani",
      vin: "ME4KC407JSA102577",
      engine: "KC40EA4102672",
      model: "Honda UNICORN",
      saleDate: "2025-10-03",
      address: "Sadaf Colony, Kat Kat Gate, Chhatrapati Sambhajinagar",
    },
    md: `# FORM 21 — Sale Certificate\n\n**Buyer**: Aasim Abbas Khan Durrani\\\n**Father's Name**: Kalim Ahmed Khan Durrani\\\n**Chassis (VIN)**: ME4KC407JSA102577\\\n**Engine**: KC40EA4102672\\\n**Model**: UNICORN (Honda)\\\n**Sale Date**: 03-Oct-2025`,
    sourceHint: "Image_003.pdf",
  },
  {
    id: "doc_form20",
    type: "Form20",
    title: "Form 20 — Application for Registration",
    pages: 2,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
      fatherName: "Kalim Ahmed Khan Durrani",
      vin: "ME4KC407JSA102577",
      engine: "KC40EA4102672",
      model: "Honda UNICORN",
      color: "Pearl Igneous Black",
      address: "Sadaf Colony, Kat Kat Gate, CSN",
      insurancePolicy: "OG-26-2006-1826-00015929",
      insuranceStart: "2025-10-03",
      insuranceEnd: "2030-10-02",
    },
    md: `# FORM 20 — Application for Registration\n\nOwner: **Aasim Abbas Khan Durrani** (S/W/D: **Kalim Ahmed Khan Durrani**)\\\nAddress: *Sadaf Colony, Kat Kat Gate, CSN*\\\nVIN: **ME4KC407JSA102577** — Engine: **KC40EA4102672**\\\nModel: **UNICORN** (Honda) — Colour: *Pearl Igneous Black*\\\nInsurance: **OG-26-2006-1826-00015929** (03-Oct-2025 → 02-Oct-2030)`,
    sourceHint: "Image_008.pdf",
  },
  {
    id: "doc_rto",
    type: "RTO Slip",
    title: "RTO Application Summary & MV-Tax",
    pages: 1,
    fields: {
      pan: "CPBPD4502G",
      engine: "KC40EA4102672",
      saleAmount: "₹1,10,501",
      mvTax: "₹12,156",
      address: "Sadaf Colony, Kat Kat Gate, CSN",
    },
    md: `# RTO Summary\n\nPAN: CPBPD4502G\\\nEngine: KC40EA4102672\\\nSale Amount: ₹1,10,501\\\nMV Tax: ₹12,156`,
    sourceHint: "Image_001.pdf",
  },
  {
    id: "doc_pan",
    type: "PAN",
    title: "PAN — CPBPD4502G",
    pages: 1,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
      fatherName: "Kalim Ahmed Khan Durrani",
      pan: "CPBPD4502G",
    },
    md: `# PAN\n\nName: **Aasim Abbas Khan Durrani**\\\nFather: **Kalim Ahmed Khan Durrani**\\\nPAN: **CPBPD4502G**`,
    sourceHint: "Image_005.pdf",
  },
  {
    id: "doc_aadhaar",
    type: "Aadhaar",
    title: "Aadhaar — 9774 7605 0439",
    pages: 1,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
      aadhaar: "9774 7605 0439",
      address: "Sadaf Colony, Kat Kat Gate, CSN",
    },
    md: `# Aadhaar\n\nAadhaar No.: **9774 7605 0439**\\\nName: **Aasim Abbas Khan Durrani**\\\nAddress: *Sadaf Colony, Kat Kat Gate, CSN*`,
    sourceHint: "Image_006.pdf",
  },
  {
    id: "doc_ins",
    type: "Insurance",
    title: "Bajaj General Insurance Policy",
    pages: 2,
    fields: {
      insurancePolicy: "OG-26-2006-1826-00015929",
      insuranceStart: "2025-10-03",
      insuranceEnd: "2030-10-02",
      model: "Honda UNICORN",
      vin: "ME4KC407JSA102577",
      engine: "KC40EA4102672",
    },
    md: `# Insurance (Bajaj)\n\nPolicy: **OG-26-2006-1826-00015929**\\\nValid: **03-Oct-2025 → 02-Oct-2030**\\\nVehicle: UNICORN — VIN: ME4KC407JSA102577 — Engine: KC40EA4102672`,
    sourceHint: "(within pack)",
  },
  {
    id: "doc_acc",
    type: "Accessories Invoice",
    title: "Accessories — Headgear (2 Nos)",
    pages: 1,
    fields: {
      buyerName: "Aasim Abbas Khan Durrani",
    },
    md: `# Accessories Invoice\n\nItem: **Headgear**, Qty: 2, Taxes: ... (separate from vehicle invoice)`,
    sourceHint: "Image_007.pdf",
  },
];

const TOTAL_DOCS = DUMMY_DOCS.length;

const ALL_FIELDS: { key: FieldKey; label: string; important?: boolean }[] = [
  { key: "vin", label: "Chassis / VIN", important: true },
  { key: "engine", label: "Engine No.", important: true },
  { key: "buyerName", label: "Buyer Name" },
  { key: "fatherName", label: "Father's Name" },
  { key: "pan", label: "PAN" },
  { key: "aadhaar", label: "Aadhaar" },
  { key: "model", label: "Model" },
  { key: "color", label: "Colour" },
  { key: "address", label: "Address" },
  { key: "saleAmount", label: "Sale Amount" },
  { key: "mvTax", label: "MV Tax" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "saleDate", label: "Sale Date" },
  { key: "insurancePolicy", label: "Insurance Policy" },
  { key: "insuranceStart", label: "Insurance Start" },
  { key: "insuranceEnd", label: "Insurance End" },
];

// ------------------------------------------------------------
// Utility helpers
// ------------------------------------------------------------

const PIPELINE_STAGES: Array<{
  id: string;
  label: string;
  description: string;
  start: number;
  end: number;
}> = [
  {
    id: "classify",
    label: "Classifying document type",
    description: "Matching against RTO, invoice, insurance, and accessory templates.",
    start: 0,
    end: 0.25,
  },
  {
    id: "ocr",
    label: "Digitizing page images",
    description: "Running OCR + layout detection to capture structured content.",
    start: 0.25,
    end: 0.55,
  },
  {
    id: "extract",
    label: "Extracting key fields",
    description: "Calling entity models to populate VIN, policy numbers, taxes, and more.",
    start: 0.55,
    end: 0.85,
  },
  {
    id: "validate",
    label: "Reconciling & validating",
    description: "Cross-checking canonical values and flagging mismatches.",
    start: 0.85,
    end: 1,
  },
];

function normalize(v?: string) {
  return (v || "").replace(/\s+/g, " ").trim().toLowerCase();
}

function pickCanonical(values: string[]) {
  // choose the mode (most frequent non-empty) as canonical
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = normalize(v);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [k, c] of counts) {
    if (c > bestCount) {
      best = k;
      bestCount = c;
    }
  }
  // return original value matching best key, else first non-empty
  return (
    values.find((v) => normalize(v) === best) || values.find((v) => !!normalize(v)) || ""
  );
}

function currencyishToNumber(v?: string) {
  if (!v) return undefined;
  const n = Number(v.replace(/[₹,\s]/g, ""));
  return isNaN(n) ? undefined : n;
}

// Compute mismatches across documents per field
function useMismatchReport(docs: CaseDoc[]) {
  return useMemo(() => {
    const byField = ALL_FIELDS.reduce(
      (acc, { key }) => {
        acc[key] = {
          canonical: "",
          values: {} as Record<DocType, string>,
          mismatchingDocs: [],
        };
        return acc;
      },
      {} as Record<FieldKey, FieldSummary>
    );

    for (const { type, fields } of docs) {
      for (const { key } of ALL_FIELDS) {
        const current = fields[key];
        if (current) byField[key].values[type] = current;
      }
    }

    for (const { key } of ALL_FIELDS) {
      const values = Object.values(byField[key].values);
      const canonical = pickCanonical(values);
      byField[key].canonical = canonical;
      const mismatchingDocs: DocType[] = [];
      for (const [docType, v] of Object.entries(byField[key].values)) {
        if (normalize(v) && canonical && normalize(v) !== normalize(canonical)) {
          mismatchingDocs.push(docType as DocType);
        }
      }
      byField[key].mismatchingDocs = mismatchingDocs;
    }

    // quick tax sanity: MV Tax ≈ 11% of sale (tolerance ±1%)
    const sale = currencyishToNumber(byField.saleAmount.canonical);
    const tax = currencyishToNumber(byField.mvTax.canonical);
    const taxOk = sale && tax ? Math.abs(tax / sale - 0.11) <= 0.01 : true;

    const allMismatches: FieldMismatch[] = [];
    for (const { key, label } of ALL_FIELDS) {
      const ent = byField[key];
      if (!ent || ent.mismatchingDocs.length === 0) continue;
      allMismatches.push({
        field: key,
        label,
        canonical: ent.canonical,
        mismatchingDocs: ent.mismatchingDocs,
      });
    }

    const risk = Math.min(100, allMismatches.length * 8 + (taxOk ? 0 : 15));

    return {
      byField,
      allMismatches,
      taxOk,
      risk,
    };
  }, [docs]);
}

// ------------------------------------------------------------
// UI Components
// ------------------------------------------------------------

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
      {children}
    </span>
  );
}

function ValueBadge({ ok }: { ok: boolean }) {
  return (
    <Badge variant={ok ? "default" : "destructive"} className="rounded-full">
      {ok ? "Match" : "Mismatch"}
    </Badge>
  );
}

function FieldValue({ value }: { value?: string }) {
  return (
    <span className="font-mono text-xs">{value || <em className="opacity-60">—</em>}</span>
  );
}

function QueueTimeline({
  docs,
  processedCount,
  currentIndex,
  currentStageLabel,
  classificationComplete,
}: {
  docs: CaseDoc[];
  processedCount: number;
  currentIndex: number;
  currentStageLabel: string;
  classificationComplete: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!docs.length) return;
    const target = listRef.current?.querySelector<HTMLElement>(
      `[data-queue-item="${currentIndex}"]`
    );
    if (target) {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [docs.length, currentIndex]);

  return (
    <div className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white/85 p-6 shadow-xl backdrop-blur max-h-[320px]">
      <div className="mb-4 text-xs uppercase tracking-[0.3em] text-slate-500">
        Queue timeline
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute left-[1.1rem] top-4 bottom-4 w-px bg-zinc-200" />
        <ScrollArea className="h-[240px] pr-1">
          <div ref={listRef} className="space-y-4 pb-3">
            {docs.map((doc, index) => {
              const isDone = index < processedCount;
              const isCurrent = index === currentIndex && processedCount < docs.length;
              const bulletClasses = isCurrent
                ? "border-slate-900 bg-slate-900"
                : isDone
                  ? "border-slate-700 bg-slate-700"
                  : "border-zinc-300 bg-white";
              const statusColor = isCurrent
                ? "text-slate-900"
                : isDone
                  ? "text-slate-600"
                  : "text-slate-400";
              const displayName =
                isDone || (isCurrent && classificationComplete)
                  ? doc.title
                  : doc.sourceHint || `${doc.id}.pdf`;
              const displayMeta = isDone
                ? doc.type
                : isCurrent
                  ? classificationComplete
                    ? doc.type
                    : "Classifying upload"
                  : "Awaiting classification";
              const statusLabel = isDone
                ? "Ready for dashboard"
                : isCurrent
                  ? classificationComplete
                    ? currentStageLabel
                    : "Classifying document type"
                  : "In queue";
              const statusIcon = isDone ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-slate-700" />
              ) : isCurrent ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
              ) : (
                <Clock3 className="h-3.5 w-3.5 text-slate-400" />
              );
              return (
                <motion.div
                  key={doc.id}
                  data-queue-item={index}
                  className="relative rounded-xl bg-transparent px-5 py-3 transition-colors hover:bg-zinc-50"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                >
                  <div
                    className={`absolute left-3 top-4 h-3 w-3 -translate-x-1/2 rounded-full border ${bulletClasses}`}
                  />
                  <div className="pl-6">
                    <div className="text-sm font-medium leading-tight text-slate-900">
                      {displayName}
                    </div>
                    <div className="text-xs text-slate-500">{displayMeta}</div>
                    <div className={`mt-2 flex items-center gap-2 text-xs font-medium ${statusColor}`}>
                      {statusIcon}
                      {statusLabel}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

export default function CaseVerifierUI() {
  const [docs, setDocs] = useState<CaseDoc[]>([]);
  const [stage, setStage] = useState<"idle" | "processing" | "ready">("idle");
  const [progress, setProgress] = useState(0);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [queuedUploads, setQueuedUploads] = useState<QueuedUpload[]>([]);

  useEffect(() => {
    if (stage !== "processing") return;
    if (TOTAL_DOCS === 0) {
      setDocs([]);
      setActiveDocId(null);
      setProgress(1);
      setStage("ready");
      return;
    }

    const duration = 15_000;
    const start = performance.now();
    setProgress(0);
    setProcessingIndex(0);

    let frameId = 0;
    const tick = () => {
      const elapsed = performance.now() - start;
      const ratio = Math.min(1, elapsed / duration);
      setProgress(ratio);
      const current = Math.min(TOTAL_DOCS - 1, Math.floor(ratio * TOTAL_DOCS));
      setProcessingIndex(current);
      if (elapsed < duration) {
        frameId = requestAnimationFrame(tick);
      }
    };

    frameId = requestAnimationFrame(tick);

    const readyTimeout = window.setTimeout(() => {
      setDocs(DUMMY_DOCS);
      setActiveDocId(DUMMY_DOCS[0]?.id ?? null);
      setProgress(1);
      setStage("ready");
    }, duration);

    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(readyTimeout);
    };
  }, [stage]);

  const { byField, allMismatches, taxOk, risk } = useMismatchReport(docs);

  const docTypes: DocType[] = useMemo(
    () => Array.from(new Set(docs.map((d) => d.type))),
    [docs]
  );

  const totalPages = useMemo(() => docs.reduce((a, d) => a + d.pages, 0), [docs]);

  const activeDoc = activeDocId ? docs.find((d) => d.id === activeDocId) : undefined;

  const uploadTemplates = useMemo(
    () => queuedUploads.map((_, index) => DUMMY_DOCS[index % DUMMY_DOCS.length]),
    [queuedUploads]
  );

  const caseName = useMemo(() => {
    const buyer = byField.buyerName?.canonical?.trim() || "";
    const vin = (byField.vin?.canonical || "").replace(/\s+/g, "");
    const tokens = buyer.split(/\s+/).filter(Boolean);
    const first = tokens[0] || "pending";
    const last = tokens.length > 1 ? tokens[tokens.length - 1] : tokens[0] || "buyer";
    const normalizedFirst = first.toLowerCase();
    const normalizedLast = last.toLowerCase();
    const normalizedVin = vin ? vin.toUpperCase() : "PENDINGVIN";
    return `${normalizedFirst}-${normalizedLast}-${normalizedVin}`;
  }, [byField.buyerName?.canonical, byField.vin?.canonical]);

  function handleStart() {
    if (queuedUploads.length === 0) return;
    setDocs([]);
    setActiveDocId(null);
    setProgress(0);
    setProcessingIndex(0);
    setQueuedUploads([]);
    setStage("processing");
  }

  function handleQueueUpload(files?: FileList | null) {
    if (!files || files.length === 0) return;
    const incoming: QueuedUpload[] = Array.from(files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      file,
    }));
    setQueuedUploads((prev) => [...prev, ...incoming]);
  }

  function handleRemoveUpload(id: string) {
    setQueuedUploads((prev) => prev.filter((item) => item.id !== id));
  }

  // simple upload stub (does not parse; just appends a placeholder doc)
  function handleUploadStub(file?: File | null) {
    if (!file || stage !== "ready") return;
    const fake: CaseDoc = {
      id: `doc_custom_${Date.now()}`,
      type: "Invoice",
      title: file.name,
      pages: 1,
      fields: { buyerName: "(extracted soon)", saleAmount: "₹0" },
      md: `# OCR Markdown\n\n*This is a placeholder for* **${file.name}**.\n\n> Wire this to Docling/PaddleOCR + Gemini Pro for real output.`,
      sourceHint: file.name,
    };
    setDocs((prev) => [...prev, fake]);
    setActiveDocId(fake.id);
  }

  if (stage === "idle") {
    const hasUploads = queuedUploads.length > 0;
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-zinc-100 to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-[8%] top-[12%] h-72 w-72 rounded-full bg-black/5 blur-3xl" />
          <div className="absolute right-[14%] bottom-[15%] h-80 w-80 rounded-full bg-black/10 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center gap-10 px-6 py-16 text-center"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-black" />
            AutoDealer Demo
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Vehicle Registration Document Verifier
            </h1>
            <p className="mx-auto max-w-2xl text-base leading-relaxed text-slate-600">
              Upload vehicle registration documents and watch our AI automatically extract key information, 
              cross-reference data across forms, and identify discrepancies for dealer compliance.
            </p>
          </div>
          <div className="w-full max-w-3xl space-y-6">
            <label className="relative flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300 bg-white/90 px-8 py-10 text-slate-600 shadow-sm transition hover:border-slate-500 hover:bg-white">
              <Upload className="h-6 w-6" />
              <div className="text-base font-medium">Upload vehicle registration documents</div>
              <p className="text-sm text-slate-500">
                Forms 20/21, invoices, insurance, PAN, Aadhaar · AI will extract and verify all data
              </p>
              <input
                type="file"
                multiple
                accept="application/pdf"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={(e) => {
                  handleQueueUpload(e.target.files);
                  if (e.target.value) e.target.value = "";
                }}
              />
            </label>

            {hasUploads && (
              <div className="w-full max-w-3xl space-y-3 text-left">
                 <div className="flex items-center justify-between">
                   <div className="text-sm font-medium text-slate-700">Registration documents ready for processing</div>
                   <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                     {queuedUploads.length} document{queuedUploads.length > 1 ? "s" : ""}
                   </div>
                 </div>
                <div className="overflow-x-auto">
                  <div className="flex items-center gap-3 pb-1">
                    {queuedUploads.map((upload, index) => {
                      const template = uploadTemplates[index % uploadTemplates.length];
                      return (
                        <Popover key={upload.id}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="group relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-400 hover:text-slate-900"
                            >
                              <FileText className="h-5 w-5" />
                              <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-black text-[11px] font-semibold text-white">
                                {index + 1}
                              </span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="center" side="top" className="w-64 text-left">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-slate-900">
                                  {upload.name}
                                </div>
                                <div className="text-xs text-slate-500">
                                  Slot {index + 1} · {template?.type ?? "Unknown type"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="rounded-full border border-slate-200 p-1 text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
                                onClick={() => handleRemoveUpload(upload.id)}
                                aria-label="Remove file"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                             <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                               Ready for processing. AI will classify as Form 20/21, Invoice, Insurance, etc.
                             </div>
                          </PopoverContent>
                        </Popover>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {hasUploads && (
            <motion.div
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
            >
              <Button
                size="lg"
                disabled={!hasUploads}
                className="group relative overflow-hidden rounded-2xl px-8 py-6 text-base font-semibold shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                onClick={handleStart}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-black via-zinc-900 to-black opacity-90 transition-opacity group-hover:opacity-100" />
                 <span className="relative z-10 flex items-center gap-2 tracking-tight text-white">
                   <Play className="h-5 w-5 fill-white" />
                   Process documents
                 </span>
              </Button>
            </motion.div>
          )}
        </motion.div>
      </main>
    );
  }

  if (stage === "processing") {
    const totalDocs = TOTAL_DOCS;
    const processedCount = Math.min(totalDocs, Math.floor(progress * totalDocs));
    const currentIndex = Math.min(totalDocs - 1, processingIndex);
    const currentDoc = DUMMY_DOCS[currentIndex];
    const fractional = progress * totalDocs - processedCount;
    const docProgress = Math.min(1, Math.max(0, fractional));
    const secondsElapsed = Math.min(15, Math.round(progress * 15));
    const secondsRemaining = Math.max(0, 15 - secondsElapsed);
    const stageIndex = PIPELINE_STAGES.findIndex((stage) => docProgress < stage.end);
    const currentStageIndex = stageIndex === -1 ? PIPELINE_STAGES.length - 1 : stageIndex;
    const currentStage = PIPELINE_STAGES[currentStageIndex] ?? PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
    const classificationStage = PIPELINE_STAGES[0];
    const classificationComplete = docProgress >= classificationStage.end;
    const sourceName = currentDoc.sourceHint || `${currentDoc.id}.pdf`;

    function stageStatus(stage: (typeof PIPELINE_STAGES)[number]) {
      if (docProgress >= stage.end) return "done";
      if (docProgress >= stage.start && docProgress < stage.end) return "active";
      return "pending";
    }

    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-white via-zinc-100 to-white text-slate-900">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-[12%] top-[8%] h-72 w-72 rounded-full bg-black/5 blur-3xl" />
          <div className="absolute right-[10%] bottom-[12%] h-80 w-80 rounded-full bg-black/10 blur-3xl" />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-8 px-6 py-12"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="text-xs uppercase tracking-[0.3em] text-slate-500">
                Document intake pipeline
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                Classifying, digitizing, and validating uploads…
              </h1>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-right shadow-lg">
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Elapsed</div>
              <div className="text-lg font-semibold text-slate-900">{secondsElapsed}s</div>
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                {secondsRemaining}s remaining
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white/90 px-6 py-6 shadow-xl backdrop-blur">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-zinc-900/5 text-slate-900 shadow-inner">
                  <Sparkles className="h-6 w-6 animate-pulse text-slate-900" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Global progress
                  </div>
                  <div className="text-3xl font-semibold text-slate-900">
                    {Math.round(progress * 100)}%
                  </div>
                </div>
              </div>
              <div className="text-sm text-slate-600">
                Analyzing{" "}
                <span className="font-semibold text-slate-900">
                  {Math.min(totalDocs, processedCount + 1)}
                </span>{" "}
                of {totalDocs} documents
              </div>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-zinc-100">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-black via-zinc-700 to-black"
                animate={{ width: `${progress * 100}%` }}
                transition={{ ease: "easeInOut", duration: 0.3 }}
              />
            </div>
          </div>

          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
            <motion.div
              key={currentDoc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.3em] text-slate-500">
                    Current document
                  </div>
                  <div className="mt-2 min-h-[56px]">
                    <AnimatePresence mode="wait">
                      {classificationComplete ? (
                        <motion.div
                          key="identified"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          <h2 className="text-lg font-semibold leading-tight text-slate-900">
                            {currentDoc.title}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">{currentDoc.type}</div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="upload"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          <h2 className="text-lg font-semibold leading-tight text-slate-900">
                            {sourceName}
                          </h2>
                          <div className="mt-1 text-sm text-slate-500">
                            Identifying document type
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <div className="text-xs text-slate-400">Source file · {sourceName}</div>
                </div>
                <div className="flex items-center gap-1 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs text-slate-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
                  {currentStage.label}
                </div>
              </div>
              <div className="mt-6 space-y-3">
                {PIPELINE_STAGES.map((stage) => {
                  const status = stageStatus(stage);
                  const dotClass =
                    status === "done"
                      ? "bg-slate-900"
                      : status === "active"
                        ? "bg-slate-900 animate-pulse"
                        : "bg-zinc-300";
                  const textClass =
                    status === "pending" ? "text-slate-400" : "text-slate-900";
                  const descriptionClass =
                    status === "pending" ? "text-slate-400" : "text-slate-500";
                  return (
                    <div key={stage.id} className="flex gap-3">
                      <span className={`mt-2 h-2 w-2 rounded-full ${dotClass}`} />
                      <div>
                        <div className={`text-sm font-medium ${textClass}`}>
                          {stage.label}
                        </div>
                        <div className={`text-xs ${descriptionClass}`}>
                          {stage.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.2em] text-slate-500">
                  <span>Document progress</span>
                  <span>{Math.round(docProgress * 100)}%</span>
                </div>
                <div className="relative h-2 overflow-hidden rounded-full bg-zinc-100">
                  <motion.div
                    className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-black via-zinc-600 to-black"
                    animate={{ width: `${docProgress * 100}%` }}
                    transition={{ ease: "easeInOut", duration: 0.25 }}
                  />
                </div>
              </div>
            </motion.div>

            <QueueTimeline
              docs={DUMMY_DOCS}
              processedCount={processedCount}
              currentIndex={currentIndex}
              currentStageLabel={currentStage.label}
              classificationComplete={classificationComplete}
            />
          </div>
        </motion.div>
      </main>
    );
  }

  // Safety check for activeDoc
  if (!activeDoc) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-600">No document selected</p>
    </div>
    );
  }

  return (
    <TooltipProvider>
      <main className="min-h-screen w-full bg-gradient-to-b from-white to-zinc-50 p-4 sm:p-6">
        {/* Top Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}>
              <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-1.5 shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                <span className="text-sm font-medium">Case Verifier</span>
              </div>
            </motion.div>
            <div className="hidden h-6 w-px bg-zinc-200 sm:block" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <Pill>
                <FileText className="h-3.5 w-3.5" /> {docs.length} docs · {totalPages} pages
              </Pill>
              <Pill>
                <GitCompare className="h-3.5 w-3.5" /> {allMismatches.length} mismatches
              </Pill>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="relative inline-flex items-center">
              <input
                type="file"
                className="peer absolute inset-0 z-10 cursor-pointer opacity-0"
                onChange={(e) => handleUploadStub(e.target.files?.[0])}
              />
              <Button variant="secondary" className="gap-2">
                <Upload className="h-4 w-4" /> Upload
              </Button>
            </label>
          </div>
        </div>

        {/* Hero Header Card */}
        <Card className="mb-4 border-zinc-200">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-zinc-900 text-white shadow">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-zinc-500">Current Case</div>
                <div className="font-medium">{caseName}</div>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="rounded-xl border bg-white px-3 py-2 text-right shadow-sm">
                  <div className="text-xs text-zinc-500">Risk Score</div>
                  <div className="text-lg font-semibold tracking-tight">{risk}</div>
                </div>
              </TooltipTrigger>
              <TooltipContent>Derived from mismatch count & reconciliation checks</TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        {/* Workspace */}
        <Tabs defaultValue="review" className="w-full">
          <TabsList className="mb-4 grid w-full grid-cols-3 sm:w-auto sm:grid-cols-3">
            <TabsTrigger value="review" className="gap-2">
              <Eye className="h-4 w-4" /> Review
            </TabsTrigger>
            <TabsTrigger value="compare" className="gap-2">
              <GitCompare className="h-4 w-4" /> Compare
            </TabsTrigger>
            <TabsTrigger value="issues" className="gap-2">
              <TriangleAlert className="h-4 w-4" /> Mismatches
            </TabsTrigger>
          </TabsList>

          {/* REVIEW TAB: Side-by-side document + extracted + Markdown OCR */}
          <TabsContent value="review">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
              {/* Left: Document browser */}
              <Card className="border-zinc-200">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="flex items-center gap-2"><FileText className="h-4 w-4" /> Documents</span>
                    <span className="text-xs text-zinc-500">Click a doc to preview source & fields</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[520px] p-3">
                    <div className="space-y-2">
                      {docs.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setActiveDocId(d.id)}
                          className={`flex w-full flex-col rounded-xl border px-3 py-2 text-left transition hover:bg-zinc-50 ${
                            activeDocId === d.id ? "border-zinc-900" : "border-zinc-200"
                          }`}
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="line-clamp-2 text-sm font-medium leading-tight">{d.title}</div>
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                              <Badge variant="outline" className="rounded-full text-[9px]">{d.type}</Badge>
                              <span className="truncate">{d.sourceHint}</span>
                            </div>
                            <div className="text-[11px] uppercase tracking-wide text-zinc-400">
                              {d.pages} page{d.pages > 1 ? "s" : ""}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

               {/* Middle: Source preview */}
               <Card className="border-zinc-200">
                 <div className="flex h-[520px] min-w-0 flex-col overflow-hidden">
                   <div className="flex-shrink-0 space-y-1 border-b px-3 py-2">
                     <div className="line-clamp-2 text-sm font-medium leading-tight">{activeDoc.title}</div>
                     <div className="flex items-center gap-2 text-xs text-zinc-500">
                       <Badge variant="secondary" className="rounded-full text-[10px]">{activeDoc.type}</Badge>
                       <span className="truncate">{activeDoc.sourceHint || "source-file.pdf"}</span>
                     </div>
                   </div>
                   <ScrollArea className="flex-1 min-h-0">
                     <div className="p-6">
                       <div className="mx-auto aspect-[3/4] w-full max-w-sm rounded-xl border bg-white p-4 shadow-sm">
                         <div className="mb-2 text-xs text-zinc-500">Source preview (placeholder)</div>
                         <div className="h-full rounded-md border bg-zinc-50" />
                       </div>
                     </div>
                   </ScrollArea>
                 </div>
               </Card>

               {/* Right: Extracted fields + OCR insights */}
               <Card className="border-zinc-200 flex flex-col overflow-hidden">
                 <Tabs defaultValue="fields" className="flex flex-col h-full">
                   <CardHeader className="flex-shrink-0 pb-0">
                     <CardTitle className="text-base">Document insights</CardTitle>
                     <TabsList className="mt-4 grid w-full grid-cols-2">
                       <TabsTrigger value="fields">Extracted fields</TabsTrigger>
                       <TabsTrigger value="ocr">OCR markdown</TabsTrigger>
                     </TabsList>
                   </CardHeader>
                   <CardContent className="flex-1 pt-4 min-h-0">
                     <TabsContent value="fields" className="h-full m-0">
                       <ScrollArea className="h-[400px]">
                         <Table>
                           <TableHeader>
                             <TableRow>
                               <TableHead>Field</TableHead>
                               <TableHead>Value</TableHead>
                               <TableHead className="w-24">Status</TableHead>
                             </TableRow>
                           </TableHeader>
                           <TableBody>
                             {ALL_FIELDS.map(({ key, label }) => {
                               const v = activeDoc.fields[key];
                               const canonical = byField[key]?.canonical;
                               const ok = !v || !canonical || normalize(v) === normalize(canonical);
                               return (
                                 <TableRow key={key}>
                                   <TableCell className="whitespace-nowrap text-sm">{label}</TableCell>
                                   <TableCell className="text-sm">
                                     <FieldValue value={v} />
                                   </TableCell>
                                   <TableCell>
                                     <ValueBadge ok={ok} />
                                   </TableCell>
                                 </TableRow>
                               );
                             })}
                           </TableBody>
                         </Table>
                       </ScrollArea>
                     </TabsContent>
                     <TabsContent value="ocr" className="h-full m-0">
                       <div className="h-full flex flex-col">
                         <ScrollArea className="flex-1">
                           <div className="rounded-xl border bg-zinc-50 p-3">
                             <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed">
                               {activeDoc.md}
                             </pre>
                           </div>
                         </ScrollArea>
                         <div className="flex-shrink-0 mt-2 flex items-center gap-2">
                           <Button
                             size="sm"
                             variant="secondary"
                             className="gap-2"
                             onClick={() => navigator.clipboard.writeText(activeDoc.md)}
                           >
                             <Copy className="h-4 w-4" /> Copy MD
                           </Button>
                           <Button size="sm" variant="ghost" className="gap-2">
                             <ExternalLink className="h-4 w-4" /> Open in new tab
                           </Button>
                         </div>
                       </div>
                     </TabsContent>
                   </CardContent>
                 </Tabs>
               </Card>
            </div>
          </TabsContent>

          {/* COMPARE TAB: Cross-doc matrix */}
          <TabsContent value="compare">
            <Card className="border-zinc-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Cross‑Document Field Comparison</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableCaption className="text-left">Canonical value is computed as the most frequent value across documents.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[220px]">Field</TableHead>
                        {docTypes.map((t) => (
                          <TableHead key={t} className="text-nowrap">{t}</TableHead>
                        ))}
                        <TableHead className="min-w-[220px]">Canonical</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ALL_FIELDS.map(({ key, label }) => (
                        <TableRow key={key}>
                          <TableCell className="text-sm font-medium">{label}</TableCell>
                          {docTypes.map((t) => {
                            const doc = docs.find((d) => d.type === t);
                            const v = doc?.fields[key];
                            const ok = !v || normalize(v) === normalize(byField[key]?.canonical);
                            return (
                              <TableCell key={t} className="align-top">
                                <div className="flex flex-col gap-1">
                                  <FieldValue value={v} />
                                  <div>
                                    <ValueBadge ok={ok} />
                                  </div>
                                  {v && (
                                    <Drawer>
                                      <DrawerTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs">Source proof</Button>
                                      </DrawerTrigger>
                                      <DrawerContent>
                                        <DrawerHeader>
                                          <DrawerTitle>Source proof — {t}</DrawerTitle>
                                        </DrawerHeader>
                                        <div className="grid gap-4 p-4 sm:grid-cols-2">
                                          <div>
                                            <div className="mb-2 text-xs text-zinc-500">Value</div>
                                            <div className="rounded-lg border bg-zinc-50 p-3 font-mono text-xs">{v}</div>
                                          </div>
                                          <div>
                                            <div className="mb-2 text-xs text-zinc-500">Snippet (bbox)</div>
                                            <div className="aspect-[3/4] w-full rounded-lg border bg-white shadow-sm" />
                                          </div>
                                        </div>
                                        <DrawerFooter>
                                          <DrawerClose asChild>
                                            <Button variant="secondary">Close</Button>
                                          </DrawerClose>
                                        </DrawerFooter>
                                      </DrawerContent>
                                    </Drawer>
                                  )}
                                </div>
                              </TableCell>
                            );
                          })}
                          <TableCell>
                            <div className="rounded-lg border bg-zinc-50 p-2 font-mono text-xs">
                              {byField[key]?.canonical || <em className="opacity-60">—</em>}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ISSUES TAB: Mismatch list with quick-fix guidance */}
          <TabsContent value="issues">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              <Card className="lg:col-span-8 border-zinc-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Mismatches & Checks</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ScrollArea className="h-[520px]">
                    <div className="divide-y">
                      {allMismatches.length === 0 && (
                        <div className="p-6 text-sm text-zinc-600">No mismatches detected. You&apos;re good! 🎉</div>
                      )}
                      {allMismatches.map((m) => (
                        <div key={m.field} className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-12">
                          <div className="sm:col-span-3">
                            <div className="text-xs text-zinc-500">Field</div>
                            <div className="font-medium">{m.label}</div>
                          </div>
                          <div className="sm:col-span-5">
                            <div className="text-xs text-zinc-500">Canonical</div>
                            <div className="rounded-lg border bg-zinc-50 p-2 font-mono text-xs">{m.canonical}</div>
                          </div>
                          <div className="sm:col-span-4">
                            <div className="text-xs text-zinc-500">Mismatching Docs</div>
                            <div className="flex flex-wrap gap-2">
                              {m.mismatchingDocs.map((d: DocType) => (
                                <Badge key={d} variant="destructive" className="rounded-full">{d}</Badge>
                              ))}
                            </div>
                          </div>
                          <div className="sm:col-span-12">
                            <div className="mt-2 rounded-xl border bg-amber-50 p-3 text-sm">
                              <div className="mb-1 font-medium">Why it matters</div>
                              <ul className="ml-4 list-disc text-amber-900">
                                <li>Incorrect particulars can cause RC rejection or cancellation; insurance may deny claims for VIN/engine mismatch.</li>
                                <li>Fix by correcting the source doc(s) to match the canonical value, then re-run verification.</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <div className="lg:col-span-4 space-y-4">
                <Card className="border-zinc-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Quick Sanity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span>VIN & Engine present on core docs</span>
                        <Badge className="rounded-full">OK</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Tax ≈ 11% of sale</span>
                        <Badge variant={taxOk ? "default" : "destructive"} className="rounded-full">
                          {taxOk ? "OK" : "Check"}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Insurance window covers pre‑registration</span>
                        <Badge className="rounded-full">OK</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-zinc-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Next Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <Button variant="secondary" className="w-full rounded-xl">Draft Fix Letter</Button>
                    <Button variant="secondary" className="w-full rounded-xl">Download Audit Bundle</Button>
                    <Button className="w-full rounded-xl">Re‑run Checks</Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>

      </main>
    </TooltipProvider>
  );
}
