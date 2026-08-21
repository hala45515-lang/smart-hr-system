const QRCode = require('qrcode');

const buildEmergencyUrl = (qrToken) => {
  const base = process.env.PUBLIC_BASE_URL || 'http://localhost:5000';
  return `${base}/api/emergency/public/${qrToken}`;
};

const generateQrDataUrl = async (qrToken) => {
  const url = buildEmergencyUrl(qrToken);
  const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 320 });
  return { url, dataUrl };
};

module.exports = { buildEmergencyUrl, generateQrDataUrl };
