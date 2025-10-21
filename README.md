# HPZ Crew Discord Bot

Bot Discord resmi untuk komunitas HPZ Crew dengan integrasi Supabase untuk sistem poin, tier, dan manajemen misi.

## 🚀 Fitur

- **Sistem Poin & Tier**: Track poin dan naik tier dari Rookie Rider → Pro Racer → HPZ Legend
- **Sistem Misi**: Berbagai misi yang bisa diselesaikan untuk mendapatkan poin
- **Welcome System**: Pesan selamat datang otomatis untuk anggota baru
- **Leaderboard**: Peringkat otomatis yang update setiap jam
- **FAQ System**: Jawaban pertanyaan yang sering diajukan
- **Database Integration**: Full Supabase integration untuk data persistence

## 📋 Perintah Bot

### `/point`
Tampilkan poin dan tier kamu saat ini

### `/misi`
Tampilkan semua misi yang tersedia dan progress kamu

### `/faq`
Tampilkan Frequently Asked Questions tentang HPZ Crew

### `/tierku`
Tampilkan informasi tier dan benefit kamu saat ini

### `/upgrade`
Tampilkan cara dan syarat untuk naik tier

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Discord.js v14
- **Database**: Supabase (PostgreSQL)
- **Additional**: Winston (logging), node-cron (scheduling)

## 📦 Instalasi

### Prerequisites

- Node.js 18+ terinstall
- Akun Discord dan server Discord
- Proyek Supabase dengan PostgreSQL database

### 1. Clone Repository

```bash
git clone <repository-url>
cd bot-discord
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Discord Application

1. Buat aplikasi baru di [Discord Developer Portal](https://discord.com/developers/applications)
2. Buat bot dan dapatkan **Bot Token**
3. Dapatkan **Application ID**
4. Enable Gateway Intents:
   - Server Members Intent
   - Message Content Intent
5. Invite bot ke server Discord dengan OAuth2 URL generator

### 4. Setup Supabase Database

1. Buat proyek baru di [Supabase](https://supabase.com)
2. Jalankan SQL schema dari `database/schema.sql` di Supabase SQL Editor
3. Dapatkan **Project URL** dan **anon key** dari Settings → API

### 5. Environment Configuration

1. Copy file environment template:

```bash
cp .env.example .env
```

2. Edit `.env` file dan isi dengan credentials kamu:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
CLIENT_ID=your_discord_application_id_here
GUILD_ID=your_discord_server_id_here

# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Channel IDs
WELCOME_CHANNEL_ID=welcome_channel_id_here
LEADERBOARD_CHANNEL_ID=leaderboard_channel_id_here
LOG_CHANNEL_ID=log_channel_id_here
```

### 6. Build dan Run

**Development Mode:**
```bash
npm run dev
```

**Production Mode:**
```bash
npm run build
npm start
```

## 🗄️ Database Schema

### Tables:
- `users`: Data pengguna Discord dan statistik
- `missions: Misi yang tersedia untuk dikerjakan
- `user_missions: Progress misi pengguna
- `point_transactions: History transaksi poin
- `faqs`: Pertanyaan dan jawaban umum
- `welcome_messages`: Template pesan selamat datang

### Functions:
- `add_user_points()`: Tambah poin ke user dengan auto tier update
- `get_user_rank()`: Dapatkan ranking user di leaderboard
- `update_updated_at_column()`: Auto-update timestamp

## 🔧 Development

### Scripts Tersedia:

```bash
npm run dev          # Development mode dengan auto-restart
npm run build        # Build TypeScript ke JavaScript
npm run start        # Production mode
npm run lint         # Cek error dengan ESLint
npm run lint:fix     # Fix error otomatis
npm run format       # Format code dengan Prettier
npm run clean        # Hapus build folder
```

### Project Structure:

```
src/
├── commands/        # Slash command implementations
├── events/          # Discord event handlers
├── handlers/        # Command and event handlers
├── services/        # Database and business logic
├── utils/           # Helper functions
├── types/           # TypeScript type definitions
└── index.ts         # Bot entry point

database/
└── schema.sql       # Supabase database schema
```

## 📊 Monitoring & Logging

Bot menggunakan Winston untuk logging dengan:

- **Console logging**: Development
- **File logging**: Production (error.log dan combined.log)
- **Structured logging**: JSON format untuk log management
- **Discord-specific logging**: Command usage, errors, user actions

Log files tersimpan di folder `logs/`.

## 🚀 Deployment

### Docker Deployment

1. Build Docker image:
```bash
docker build -t hpz-crew-bot .
```

2. Run container:
```bash
docker run -d --name hpz-bot --env-file .env hpz-crew-bot
```

### PM2 Deployment

```bash
npm install -g pm2
pm2 start ecosystem.config.js
```

### Environment Variables untuk Production:

- Set `LOG_LEVEL=info` atau `warn`
- Set `LOG_FILE_ENABLED=true`
- Gunakan strong secrets untuk Supabase keys
- Setup proper backup untuk database

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push ke branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - lihat file [LICENSE](LICENSE) untuk detail

## 🆘 Support

Jika mengalami masalah:

1. Cek logs di `logs/` folder
2. Pastikan environment variables sudah benar
3. Verify Discord permissions dan Supabase setup
4. Hubungi development team

## 🔗 Links

- [Discord Developer Portal](https://discord.com/developers/applications)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Discord.js Documentation](https://discord.js.org/)
- [HPZ Crew Website](https://hpztv.com)

---

**HPZ Crew - Ride with Pride, Grow Together!** 🏍️