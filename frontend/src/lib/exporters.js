// Iter 56 · Client-side document export utilities
// Used by Business Builder + any other markdown-output tool.

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";

// ---------- Markdown → plain lines (light parse for export) ----------
const _splitLines = (md) => (md || "").replace(/\r\n/g, "\n").split("\n");

// ---------- PDF (jsPDF, simple text layout) ----------
export const exportMarkdownToPDF = (markdown, filename = "document.pdf") => {
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const margin = 56;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const maxW = pageW - margin * 2;
    let y = margin;
    const lineH = 14;

    const writeLine = (text, opts = {}) => {
        const fontSize = opts.size || 11;
        const bold = !!opts.bold;
        doc.setFont("helvetica", bold ? "bold" : "normal");
        doc.setFontSize(fontSize);
        const wrapped = doc.splitTextToSize(text || " ", maxW);
        for (const w of wrapped) {
            if (y > pageH - margin) { doc.addPage(); y = margin; }
            doc.text(w, margin, y);
            y += lineH * (fontSize / 11);
        }
    };

    for (const raw of _splitLines(markdown)) {
        const line = raw.replace(/\*\*/g, "");
        if (/^# /.test(line))      writeLine(line.replace(/^# /, ""), { size: 18, bold: true });
        else if (/^## /.test(line)) writeLine(line.replace(/^## /, ""), { size: 14, bold: true });
        else if (/^### /.test(line)) writeLine(line.replace(/^### /, ""), { size: 12, bold: true });
        else if (/^[-*] /.test(line)) writeLine("• " + line.replace(/^[-*] /, ""));
        else if (line.trim() === "") y += 8;
        else if (line.trim() === "---") { y += 6; doc.line(margin, y, pageW - margin, y); y += 12; }
        else writeLine(line);
    }
    doc.save(filename);
};

// ---------- DOCX (docx lib) ----------
export const exportMarkdownToDOCX = async (markdown, filename = "document.docx") => {
    const lines = _splitLines(markdown);
    const children = [];

    for (const raw of lines) {
        const line = raw.replace(/\*\*/g, "");
        if (/^# /.test(line))
            children.push(new Paragraph({ text: line.replace(/^# /, ""), heading: HeadingLevel.HEADING_1 }));
        else if (/^## /.test(line))
            children.push(new Paragraph({ text: line.replace(/^## /, ""), heading: HeadingLevel.HEADING_2 }));
        else if (/^### /.test(line))
            children.push(new Paragraph({ text: line.replace(/^### /, ""), heading: HeadingLevel.HEADING_3 }));
        else if (/^[-*] /.test(line))
            children.push(new Paragraph({ text: line.replace(/^[-*] /, ""), bullet: { level: 0 } }));
        else if (line.trim() === "")
            children.push(new Paragraph({ text: "" }));
        else
            children.push(new Paragraph({ children: [new TextRun(line)] }));
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);
};

// ---------- CSV (parse markdown tables) ----------
export const exportMarkdownTableToCSV = (markdown, filename = "data.csv") => {
    const tableLines = _splitLines(markdown).filter((l) => /\|/.test(l) && !/^\s*\|?\s*-+/.test(l));
    if (tableLines.length === 0) {
        const blob = new Blob(["No tabular data found"], { type: "text/csv" });
        saveAs(blob, filename);
        return;
    }
    const rows = tableLines.map((l) =>
        l.split("|").slice(1, -1).map((c) => `"${c.trim().replace(/"/g, '""')}"`).join(",")
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" });
    saveAs(blob, filename);
};

// ---------- Print (browser print) ----------
export const printMarkdown = (markdown, title = "Document") => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = markdownToHTML(markdown);
    w.document.write(`
<!DOCTYPE html><html><head><title>${title}</title>
<style>body{font-family:Georgia,serif;max-width:7in;margin:1in auto;line-height:1.55}h1{font-size:24pt;margin-top:0}h2{font-size:16pt;margin-top:1.5em}h3{font-size:13pt}hr{border:none;border-top:1px solid #ccc;margin:1.5em 0}table{border-collapse:collapse;margin:1em 0}td,th{border:1px solid #999;padding:6px 10px}</style>
</head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
};

// ---------- Save to localStorage workspace ----------
export const saveToWorkspace = (toolKey, label, markdown) => {
    const KEY = "cb_builder_workspace";
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { /* noop */ }
    arr.unshift({
        id: `bb_${Date.now()}`,
        tool: toolKey,
        label,
        markdown,
        saved_at: new Date().toISOString(),
    });
    arr = arr.slice(0, 30); // keep last 30
    try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch { /* noop */ }
    return arr;
};

export const loadWorkspace = () => {
    try { return JSON.parse(localStorage.getItem("cb_builder_workspace") || "[]"); }
    catch { return []; }
};

// Light markdown → HTML for print preview (kept simple — supports headings,
// lists, tables, hr, paragraphs).
export const markdownToHTML = (md) => {
    const lines = _splitLines(md || "");
    const out = [];
    let inList = false;
    let inTable = false;
    const closeList = () => { if (inList) { out.push("</ul>"); inList = false; } };
    const closeTable = () => { if (inTable) { out.push("</tbody></table>"); inTable = false; } };

    for (const raw of lines) {
        const line = raw.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
        if (/^# /.test(line)) { closeList(); closeTable(); out.push(`<h1>${line.replace(/^# /, "")}</h1>`); }
        else if (/^## /.test(line)) { closeList(); closeTable(); out.push(`<h2>${line.replace(/^## /, "")}</h2>`); }
        else if (/^### /.test(line)) { closeList(); closeTable(); out.push(`<h3>${line.replace(/^### /, "")}</h3>`); }
        else if (/^---+$/.test(line.trim())) { closeList(); closeTable(); out.push("<hr>"); }
        else if (/^\s*[-*] /.test(line)) {
            closeTable();
            if (!inList) { out.push("<ul>"); inList = true; }
            out.push(`<li>${line.replace(/^\s*[-*] /, "")}</li>`);
        } else if (/\|/.test(line)) {
            closeList();
            const cells = line.split("|").slice(1, -1).map((c) => c.trim());
            if (/^\s*-+/.test(cells.join(""))) continue;
            if (!inTable) {
                out.push("<table><thead><tr>" + cells.map((c) => `<th>${c}</th>`).join("") + "</tr></thead><tbody>");
                inTable = true;
            } else {
                out.push("<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>");
            }
        } else if (line.trim() === "") {
            closeList();
            closeTable();
            out.push("<br>");
        } else {
            closeList();
            closeTable();
            out.push(`<p>${line}</p>`);
        }
    }
    closeList(); closeTable();
    return out.join("\n");
};
