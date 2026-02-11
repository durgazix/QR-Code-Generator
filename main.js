let qrCanvas = null;
let qrImage = null;
let qrSizePx = 256;

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

function createQrDesign(container, size) {
    const wrapper = document.createElement("div");
    wrapper.className = "qr-design";
    wrapper.style.setProperty("--qr-size", size + "px");

    const shell = document.createElement("div");
    shell.className = "qr-shell";

    const qrInner = document.createElement("div");
    qrInner.className = "qr-inner";

    const pill = document.createElement("div");
    pill.className = "scan-pill";

    const icon = document.createElement("div");
    icon.className = "scan-icon";

    const label = document.createElement("div");
    label.className = "scan-text";
    label.textContent = "SCAN ME";

    pill.appendChild(icon);
    pill.appendChild(label);

    shell.appendChild(qrInner);
    wrapper.appendChild(shell);
    wrapper.appendChild(pill);
    container.appendChild(wrapper);

    return qrInner;
}

function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
}

function getRenderedQrElement() {
    if (qrCanvas) return Promise.resolve(qrCanvas);
    if (!qrImage) return Promise.resolve(null);
    if (qrImage.complete) return Promise.resolve(qrImage);

    return new Promise((resolve, reject) => {
        qrImage.onload = () => resolve(qrImage);
        qrImage.onerror = reject;
    });
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
    qrSizePx = size;

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

    const qrTarget = createQrDesign(container, size);

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
                qrTarget.appendChild(canvas);
                downloadBtn.disabled = false;
            }
        );
        return;
    }

    try {
        new QRCode(qrTarget, {
            text: url,
            width: size,
            height: size,
            colorDark: fgColor,
            colorLight: bgColor,
            correctLevel: QRCode.CorrectLevel.H
        });

        qrImage = qrTarget.querySelector("img");
        qrCanvas = qrTarget.querySelector("canvas");

        if (!qrImage && !qrCanvas) {
            throw new Error("QR render failed");
        }

        downloadBtn.disabled = false;
    } catch {
        showError("Generation failed");
        container.innerHTML = '<div class="empty-state">QR code will appear here</div>';
    }
}

async function downloadQR() {
    if (!qrCanvas && !qrImage) {
        showError("Generate a QR code first");
        return;
    }

    let qrElement;
    try {
        qrElement = await getRenderedQrElement();
    } catch {
        showError("Download failed");
        return;
    }

    if (!qrElement) {
        showError("Download failed");
        return;
    }

    const framePadding = 14;
    const innerPadding = 14;
    const shellRadius = 28;
    const innerRadius = 16;
    const pillHeight = Math.round(Math.max(92, qrSizePx * 0.3));
    const pillGap = 18;
    const pillRadius = Math.round(pillHeight / 2);
    const iconSize = Math.round(pillHeight * 0.66);
    const iconInset = Math.round(iconSize * 0.26);
    const topBlock = qrSizePx + framePadding * 2 + innerPadding * 2;
    const width = topBlock;
    const height = topBlock + pillGap + pillHeight;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;

    const ctx = exportCanvas.getContext("2d");
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = "#000000";
    roundedRect(ctx, 0, 0, topBlock, topBlock, shellRadius);
    ctx.fill();

    const innerOffset = framePadding;
    const innerSize = topBlock - framePadding * 2;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, innerOffset, innerOffset, innerSize, innerSize, innerRadius);
    ctx.fill();

    const qrOffset = framePadding + innerPadding;
    ctx.drawImage(qrElement, qrOffset, qrOffset, qrSizePx, qrSizePx);

    const pillY = topBlock + pillGap;
    ctx.fillStyle = "#000000";
    roundedRect(ctx, 0, pillY, width, pillHeight, pillRadius);
    ctx.fill();

    const iconX = 14;
    const iconY = pillY + Math.round((pillHeight - iconSize) / 2);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#000000";
    roundedRect(
        ctx,
        iconX + iconInset,
        iconY + iconInset - 1,
        iconSize - iconInset * 2,
        iconSize - iconInset - 8,
        7
    );
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(iconX + iconSize / 2, iconY + iconSize - 10, 4, 0, Math.PI * 2);
    ctx.fill();

    const text = "SCAN ME";
    const textX = iconX + iconSize + 20;
    const textMaxWidth = width - textX - 14;
    let textSize = Math.round(pillHeight * 0.5);

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";

    while (textSize > 16) {
        ctx.font = `800 ${textSize}px Arial, sans-serif`;
        if (ctx.measureText(text).width <= textMaxWidth) {
            break;
        }
        textSize -= 1;
    }

    ctx.fillText(text, textX, pillY + pillHeight / 2 + 1);

    const link = document.createElement("a");
    link.download = "qr-code.png";
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
}
