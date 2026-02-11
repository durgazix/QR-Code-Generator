let qrCanvas = null;
let qrImage = null;

const sizeRange = document.getElementById("sizeRange");
const sizeValue = document.getElementById("sizeValue");
const urlInput = document.getElementById("urlInput");

sizeRange.addEventListener("input", function (e) {
    sizeValue.textContent = e.target.value + "px";
});

urlInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        generateQR();
    }
});

function showError(message) {
    const errorMsg = document.getElementById("errorMsg");
    errorMsg.textContent = message;
    errorMsg.classList.add("show");
    setTimeout(() => errorMsg.classList.remove("show"), 3000);
}

function normalizeInput(input) {
    const value = input.trim();
    if (!value) return "";
    if (/^https?:\/\//i.test(value)) return value;
    return "https://" + value;
}

function generateQR() {
    const hasNodeApi = typeof QRCode !== "undefined" && typeof QRCode.toCanvas === "function";
    const hasBrowserApi = typeof QRCode !== "undefined" && typeof QRCode.CorrectLevel !== "undefined";

    if (!hasNodeApi && !hasBrowserApi) {
        showError("QR library failed to load. Please refresh or try another network.");
        return;
    }

    const rawInput = urlInput.value;
    const url = normalizeInput(rawInput);
    const size = Number(document.getElementById("sizeRange").value);
    const fgColor = document.getElementById("fgColor").value;
    const bgColor = document.getElementById("bgColor").value;
    const container = document.getElementById("qrContainer");
    const downloadBtn = document.getElementById("downloadBtn");

    container.innerHTML = "";
    downloadBtn.disabled = true;
    qrCanvas = null;
    qrImage = null;

    if (!url) {
        showError("Please enter a URL");
        container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
        return;
    }

    try {
        new URL(url);
    } catch {
        showError("Invalid URL format");
        container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
        return;
    }

    if (hasNodeApi) {
        QRCode.toCanvas(
            url,
            {
                width: size,
                color: { dark: fgColor, light: bgColor },
                errorCorrectionLevel: "H"
            },
            function (error, canvas) {
                if (error) {
                    showError("Generation failed");
                    container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
                    return;
                }
                qrCanvas = canvas;
                container.appendChild(canvas);
                downloadBtn.disabled = false;
            }
        );
        return;
    }

    try {
        new QRCode(container, {
            text: url,
            width: size,
            height: size,
            colorDark: fgColor,
            colorLight: bgColor,
            correctLevel: QRCode.CorrectLevel.H
        });

        qrImage = container.querySelector("img");
        qrCanvas = container.querySelector("canvas");

        if (!qrImage && !qrCanvas) {
            throw new Error("QR render failed");
        }

        downloadBtn.disabled = false;
    } catch {
        showError("Generation failed");
        container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
    }
}

function downloadQR() {
    if (!qrCanvas && !qrImage) {
        showError("Generate a QR code first");
        return;
    }

    const link = document.createElement("a");
    link.download = "qr-code.png";

    if (qrCanvas) {
        link.href = qrCanvas.toDataURL("image/png");
    } else {
        link.href = qrImage.src;
    }

    link.click();
}
