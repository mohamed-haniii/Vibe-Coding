import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import authController from './src/server/controllers/authController';
import patientsController from './src/server/controllers/patientsController';
import visitsController from './src/server/controllers/visitsController';
import shiftsController from './src/server/controllers/shiftsController';
import reportsController from './src/server/controllers/reportsController';
import adminController from './src/server/controllers/adminController';
import networkController from './src/server/controllers/networkController';
import dietPlansController from './src/server/controllers/dietPlansController';
import settingsController from './src/server/controllers/settingsController';
import { getDb } from './src/server/db';

import { setSocketIO } from './src/server/socket';

import os from 'os';

export let io: SocketIOServer;

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push(iface.address);
      }
    }
  }
  return ips;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Gracefully handle malformed JSON bodies
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      console.error('[JSON Parser Error] Malformed JSON received:', err.message);
      return res.status(400).json({ message: 'تنسيق البيانات المرسلة غير صالح (Malformed JSON)' });
    }
    next(err);
  });

  // Create HTTP Server
  const httpServer = http.createServer(app);

  // Initialize Socket.IO
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
  });
  setSocketIO(io);

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] Device connected: ${socket.id}`);

    socket.on('join-room', (roomName) => {
      socket.join(roomName);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Device disconnected: ${socket.id}`);
    });
  });

  // Initialize Database
  await getDb();
  console.log('[Database] SQLite Database initialized with tables & seed data');

  // API Routes FIRST
  app.use('/api/auth', authController);
  app.use('/api/patients', patientsController);
  app.use('/api/visits', visitsController);
  app.use('/api/shifts', shiftsController);
  app.use('/api/reports', reportsController);
  app.use('/api/admin', adminController);
  app.use('/api/network', networkController);
  app.use('/api/diet-plans', dietPlansController);
  app.use('/api/settings', settingsController);

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'Clinic Management API', timestamp: new Date().toISOString() });
  });

  app.get('/manifest.json', (req, res) => {
    res.json({
      name: 'نظام إدارة عيادة التخسيس والتغذية',
      short_name: 'برنامج العيادة',
      description: 'نظام كامل لإدارة عيادات التخسيس والتغذية العلاجية',
      start_url: '/',
      display: 'standalone',
      background_color: '#0f172a',
      theme_color: '#7c3aed'
    });
  });

  // Vite Middleware for Dev Mode OR Static Server for Prod
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalIpAddresses();
    console.log('\n================================================================');
    console.log('       [+] سيرفر العيادة يعمل الآن بنجاح على هذا الجهاز!        ');
    console.log('================================================================');
    console.log(` 1. الجهاز الرئيسي (هذا الكمبيوتر): http://localhost:${PORT}`);
    if (ips.length > 0) {
      console.log(' 2. لربط الجهاز الثاني (الرسبشن أو الاستقبال) بنفس الشبكة:');
      ips.forEach(ip => {
        console.log(`    --> افتح متصفح الكروم على الجهاز الثاني واكتب: http://${ip}:${PORT}`);
      });
      console.log('    (تنبيه مهم: لا تقم بتشغيل الملف السوداء على الجهاز الثاني حتى لا تعمل على داتا منفصلة!)');
    }
    console.log('================================================================\n');
  });
}

startServer().catch((err) => {
  console.error('[Server Error] Failed to start clinic server:', err);
});
