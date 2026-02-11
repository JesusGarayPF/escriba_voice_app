"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const path_1 = __importDefault(require("path"));
const stt_1 = __importDefault(require("./stt"));
const tts_1 = __importDefault(require("./tts"));
const app = (0, express_1.default)();
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({ origin: true }));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json({ limit: '5mb' }));
// Rutas principales
app.use('/stt', stt_1.default);
app.use('/tts', tts_1.default);
// Opción: servir estáticos de debug (no imprescindible)
app.use('/static', express_1.default.static(path_1.default.resolve(__dirname, '../uploads')));
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => {
    res.send('ESCRIBA backend está funcionando. Rutas: POST /stt, POST /tts');
});
app.listen(PORT, () => {
    console.log(`ESCRIBA backend escuchando en http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map