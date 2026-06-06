import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.routes';
import { errorHandler } from './middlewares/errorHandler';
import { whatsappService } from './services/whatsapp.service';
import 'express-async-errors'; // ensure async errors are caught and passed to errorHandler

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'PUT'],
  },
});

const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure public images directory exists and serve it statically
const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}
app.use('/images', express.static(imagesDir));

// Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use(errorHandler);

// Socket.io Connection
io.on('connection', (socket) => {
  console.log('Client connected to socket.io');
  // Send current status immediately
  socket.emit('whatsapp_status', whatsappService.getStatus());

  socket.on('disconnect', () => {
    console.log('Client disconnected from socket.io');
  });
});

// Start Server & Initialize WhatsApp
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  // Initialize WhatsApp connection loop
  whatsappService.init(io);
});
