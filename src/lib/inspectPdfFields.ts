/* src/lib/inspectPdfFields.ts */

import { PDFDocument } from "pdf-lib";

export async function inspectPdfFields() {
    const pdfBytes = await fetch("/building-permit.pdf").then((res) =>
        res.arrayBuffer()
    );

    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    const fields = form.getFields();

    console.table(
        fields.map((field) => ({
            name: field.getName(),
            type: field.constructor.name,
        }))
    );
}