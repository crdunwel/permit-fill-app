/* src/App.tsx */

import { useRef, useState } from "react";
import { PDFDocument, StandardFonts } from "pdf-lib";
import "./App.css";

type PermitFormData = {
  ownerName: string;
  ownerAddress: string;
  city: string;
  zip: string;
  phone: string;
  ownerSocialLast4: string;
};

const initialFormData: PermitFormData = {
  ownerName: "",
  ownerAddress: "",
  city: "",
  zip: "",
  phone: "",
  ownerSocialLast4: "",
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function makeSafeFilenamePart(value: string) {
  return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
}

export default function App() {
  const [formData, setFormData] = useState<PermitFormData>(initialFormData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function updateField(field: keyof PermitFormData, value: string) {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function getCanvasPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const rect = canvas.getBoundingClientRect();

    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function startSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const context = canvas.getContext("2d");
    const point = getCanvasPoint(event);

    if (!context) return;

    canvas.setPointerCapture(event.pointerId);

    context.beginPath();
    context.moveTo(point.x, point.y);

    setIsSigning(true);
    setHasSignature(true);
  }

  function drawSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!isSigning) return;

    const context = event.currentTarget.getContext("2d");
    const point = getCanvasPoint(event);

    if (!context) return;

    context.lineTo(point.x, point.y);
    context.strokeStyle = "#111827";
    context.lineWidth = 4;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.stroke();
  }

  function endSignature(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsSigning(false);
  }

  function clearSignature() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function generatePdf() {
    setIsGenerating(true);

    try {
      const pdfUrl = `${import.meta.env.BASE_URL}building-permit.pdf`;

      const pdfBytes = await fetch(pdfUrl).then((response) => {
        if (!response.ok) {
          throw new Error("Could not load building-permit.pdf");
        }

        return response.arrayBuffer();
      });

      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      const ownerField = form.getTextField("Owner");
      const addressField = form.getTextField("Address_2");
      const cityField = form.getTextField("City_2");
      const stateField = form.getTextField("State_2");
      const zipField = form.getTextField("Zip_2");
      const phoneField = form.getTextField("Phone");
      const socialLast4Field = form.getTextField("Owners Social Security No");
      const printedNameField = form.getTextField(
          "Page 1 PRINT NAME of owner or agent"
      );

      ownerField.setText(formData.ownerName);
      addressField.setText(formData.ownerAddress);
      cityField.setText(formData.city);
      stateField.setText("FL");
      zipField.setText(formData.zip);
      phoneField.setText(formData.phone);
      socialLast4Field.setText(formData.ownerSocialLast4);
      printedNameField.setText(formData.ownerName);

      ownerField.updateAppearances(font);
      addressField.updateAppearances(font);
      cityField.updateAppearances(font);
      stateField.updateAppearances(font);
      zipField.updateAppearances(font);
      phoneField.updateAppearances(font);
      socialLast4Field.updateAppearances(font);
      printedNameField.updateAppearances(font);

      const canvas = canvasRef.current;

      if (!canvas || !hasSignature) {
        throw new Error("Signature is required.");
      }

      const signatureDataUrl = canvas.toDataURL("image/png");
      const signatureImage = await pdfDoc.embedPng(signatureDataUrl);

      const maxSignatureWidth = 260;
      const maxSignatureHeight = 16;

      const originalSize = signatureImage.scale(1);
      const scale = Math.min(
          maxSignatureWidth / originalSize.width,
          maxSignatureHeight / originalSize.height
      );

      const finalWidth = originalSize.width * scale;
      const finalHeight = originalSize.height * scale;

      firstPage.drawImage(signatureImage, {
        x: 36,
        y: 160 + (maxSignatureHeight - finalHeight) / 2,
        width: finalWidth,
        height: finalHeight,
      });

      const completedPdfBytes = await pdfDoc.save({
        updateFieldAppearances: false,
      });

      const pdfArrayBuffer = new ArrayBuffer(completedPdfBytes.byteLength);
      const pdfArray = new Uint8Array(pdfArrayBuffer);

      pdfArray.set(completedPdfBytes);

      const blob = new Blob([pdfArrayBuffer], {
        type: "application/pdf",
      });

      const ownerNamePart = makeSafeFilenamePart(formData.ownerName);
      const addressPart = makeSafeFilenamePart(formData.ownerAddress);

      const fileName = ["permit-application", ownerNamePart, addressPart]
          .filter(Boolean)
          .join("_")
          .concat(".pdf");

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = fileName;
      link.click();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Could not generate the PDF. Check the console for details.");
    } finally {
      setIsGenerating(false);
    }
  }

  const canGenerate =
      formData.ownerName.trim() &&
      formData.ownerAddress.trim() &&
      formData.city.trim() &&
      formData.zip.trim() &&
      formData.phone.trim() &&
      formData.ownerSocialLast4.trim().length === 4 &&
      hasSignature;

  return (
      <main className="page">
        <section className="card">
          <p className="eyebrow">Miami-Dade Permit Helper</p>

          <h1>Complete your permit owner fields</h1>

          <p className="intro">
            Fill the required owner information, sign once, and generate a
            completed Miami-Dade permit application PDF.
          </p>

          <div className="formGrid">
            <label>
              Owner name
              <input
                  value={formData.ownerName}
                  onChange={(event) => updateField("ownerName", event.target.value)}
                  placeholder="Full legal name"
              />
            </label>

            <label>
              Owner address
              <input
                  value={formData.ownerAddress}
                  onChange={(event) =>
                      updateField("ownerAddress", event.target.value)
                  }
                  placeholder="Street address"
              />
            </label>

            <label>
              City
              <input
                  value={formData.city}
                  onChange={(event) => updateField("city", event.target.value)}
                  placeholder="Miami, Hialeah, Homestead..."
              />
            </label>

            <div className="stateZipRow">
              <label>
                State
                <input value="FL" disabled />
              </label>

              <label>
                Zip
                <input
                    value={formData.zip}
                    onChange={(event) =>
                        updateField(
                            "zip",
                            event.target.value.replace(/\D/g, "").slice(0, 5)
                        )
                    }
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="33176"
                />
              </label>
            </div>

            <label>
              Phone
              <input
                  value={formData.phone}
                  onChange={(event) =>
                      updateField("phone", formatPhoneNumber(event.target.value))
                  }
                  inputMode="tel"
                  maxLength={14}
                  placeholder="(305) 555-1234"
              />
            </label>

            <label>
              Last 4 digits of owner SSN
              <input
                  value={formData.ownerSocialLast4}
                  onChange={(event) =>
                      updateField(
                          "ownerSocialLast4",
                          event.target.value.replace(/\D/g, "").slice(0, 4)
                      )
                  }
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="1234"
              />
            </label>
          </div>

          <div className="signaturePad">
            <div className="signaturePadHeader">
              <span>Signature</span>

              <button
                  type="button"
                  className="secondaryButton"
                  onClick={clearSignature}
              >
                Clear
              </button>
            </div>

            <canvas
                ref={canvasRef}
                width={700}
                height={180}
                className="signatureCanvas"
                onPointerDown={startSignature}
                onPointerMove={drawSignature}
                onPointerUp={endSignature}
                onPointerCancel={endSignature}
            />

            <p className="signatureHint">
              Sign with your finger, mouse, or trackpad.
            </p>
          </div>

          <p className="notice">
            This prepares the PDF only. Your contractor may still require wet
            signature, notarization, or county-specific submission steps.
          </p>

          <button disabled={!canGenerate || isGenerating} onClick={generatePdf}>
            {isGenerating ? "Generating..." : "Generate completed PDF"}
          </button>
        </section>
      </main>
  );
}