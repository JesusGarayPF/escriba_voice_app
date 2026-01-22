import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';

import sttRouter from './stt';
import ttsRouter from './tts';

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(morgan('dev'));
app.use(express.json({ limit: '5mb' }));

// Rutas principales
app.use('/stt', sttRouter);
app.use('/tts', ttsRouter);

// Opción: servir estáticos de debug (no imprescindible)
app.use('/static', express.static(path.resolve(__dirname, '../uploads')));

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
  res.send('ESCRIBA backend está funcionando. Rutas: POST /stt, POST /tts');
});
app.listen(PORT, () => {
  console.log(`ESCRIBA backend escuchando en http://localhost:${PORT}`);
});
