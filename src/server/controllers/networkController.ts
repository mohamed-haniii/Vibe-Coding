import { Router, Request, Response } from 'express';
import os from 'os';
import QRCode from 'qrcode';

const router = Router();

function getLocalIpAddress(): string {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    if (iface) {
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal && alias.address !== '127.0.0.1') {
          return alias.address;
        }
      }
    }
  }
  return 'localhost';
}

router.get('/info', async (req: Request, res: Response) => {
  try {
    const serverIp = getLocalIpAddress();
    const port = 3000;
    const protocol = req.protocol || 'http';
    
    const localNetworkUrl = `http://${serverIp}:${port}`;

    // If running in cloud container (APP_URL set) use that, otherwise use localNetworkUrl so 2nd device gets real IP instead of localhost
    const appUrl = process.env.APP_URL || (serverIp !== 'localhost' ? localNetworkUrl : `${protocol}://${req.get('host')}`);

    // Generate QR code data URL pointing to the actual local network URL or cloud URL
    const qrCodeDataUrl = await QRCode.toDataURL(appUrl, {
      margin: 2,
      width: 280,
      color: {
        dark: '#1565C0',
        light: '#FFFFFF'
      }
    });

    return res.json({
      serverIp,
      port,
      appUrl,
      localNetworkUrl,
      qrCodeDataUrl
    });
  } catch (err: any) {
    return res.status(500).json({ message: 'فشل في جلب تفاصيل اتصال الشبكة' });
  }
});

// Auto-Discovery Endpoint for Local Network (Bonjour / mDNS Broadcast Beacon)
router.get('/discover', async (req: Request, res: Response) => {
  try {
    const serverIp = getLocalIpAddress();
    const port = 3000;
    const localNetworkUrl = `http://${serverIp}:${port}`;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');

    return res.json({
      status: 'discovered',
      service: 'ClinicDoctorServer',
      serverName: 'خادم عيادة الدكتورة الرئيسي',
      clinicTitle: 'عيادة التخسيس والتغذية العلاجية',
      ip: serverIp,
      port,
      url: localNetworkUrl,
      broadcastTime: new Date().toISOString(),
      discoveredVia: 'LAN Auto-Discovery Beacon'
    });
  } catch (err: any) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;
