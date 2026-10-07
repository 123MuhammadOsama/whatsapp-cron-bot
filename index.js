import { makeWASocket, useMultiFileAuthState, DisconnectReason } from '@whiskeysockets/baileys';
import cron from 'node-cron';
import qrcode from 'qrcode-terminal';
import pino from 'pino';

// ================= CONFIGURATION =================
const RECIPIENT_NUMBERS = [
  '923451696800@s.whatsapp.net',
  '923333249733@s.whatsapp.net',
];

const MESSAGE_TEXT = 'Restart the Excel Server.';
const TIMEZONE = 'Asia/Karachi';
// =================================================

let sock;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendMessageNow() {
  if (!sock) {
    console.log('⚠️ WhatsApp socket is not connected yet.');
    return;
  }

  for (const number of RECIPIENT_NUMBERS) {
    try {
      console.log(`⏳ Sending message to ${number}...`);
      await sock.sendMessage(number, { text: MESSAGE_TEXT });
      console.log(`🚀 Message sent to ${number}`);
    } catch (err) {
      console.error(`❌ Failed to send to ${number}:`, err);
    }
    await sleep(3000); // 3 sec gap, taake WhatsApp spam na samjhe
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    defaultQueryTimeoutMs: undefined,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\nSCAN THIS QR CODE WITH YOUR WHATSAPP:\n');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Connection closed (Code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 5000);
      } else {
        console.log('Logged out. Please delete auth_info_baileys folder and scan again.');
      }
    } else if (connection === 'open') {
      console.log('✅ WhatsApp Connected Successfully!');
      console.log('⏰ Bot ready! Scheduled for 11:30 AM (Monday to Friday).');
    }
  });
}

// 11:30 AM, Monday to Friday
cron.schedule('30 11 * * 1-5', async () => {
  console.log(`[${new Date().toLocaleString('en-US', { timeZone: TIMEZONE })}] 🔔 Executing scheduled job...`);
  await sendMessageNow();
}, {
  timezone: TIMEZONE,
});

console.log('🤖 Bot Script Started. Connecting to WhatsApp...');
connectToWhatsApp();