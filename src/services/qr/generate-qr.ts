import QRCode from "qrcode";

export async function generateQrDataUrl(value: string) {
  return QRCode.toDataURL(value, { margin: 1, width: 320 });
}
