# DigiFix Web App

A modern Next.js 14 web application for the DigiFix Car Marketplace.

## Features

- 🔍 **Number Plate Search** - Find compatible car parts by entering your vehicle's number plate
- 🛒 **Shopping Cart** - Add parts to cart with persistent storage
- 📱 **Responsive Design** - Works beautifully on desktop, tablet, and mobile
- 🎨 **Modern UI** - Red, black, and white theme with smooth animations
- 🔐 **User Authentication** - Login and registration system

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **HTTP Client:** Axios
- **Icons:** Lucide React
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Backend API running (see main project README)

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.example .env.local
```

3. Update `.env.local` with your API URL:
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000` (or next available port).

### Production Build

```bash
npm run build
npm start
```

### Docker

Build and run with Docker:
```bash
docker build -t digifix-web .
docker run -p 3001:3001 digifix-web
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Home page
│   ├── layout.tsx         # Root layout
│   ├── parts/             # Parts listing page
│   ├── cart/              # Shopping cart page
│   └── login/             # Authentication page
├── components/            # React components
│   ├── layout/           # Layout components (Navbar, Footer)
│   ├── home/             # Home page sections
│   └── products/         # Product components
├── lib/                  # Utilities and API client
└── store/                # Zustand stores
```

## Theme Colors

The app uses a red, black, and white color scheme:

- **Primary Red:** #DC2626
- **Black/Dark:** #0A0A0A, #1A1A1A
- **White:** #FFFFFF
- **Gray accents:** #6B7280

## API Endpoints

The web app connects to these backend endpoints:

- `GET /api/car-parts` - List all car parts
- `GET /api/car-parts/:id` - Get part details
- `GET /api/car-parts/search/:numberPlate` - Search by number plate
- `GET /api/categories` - List categories
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration

## License

MIT
