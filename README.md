# Recruitment Application

A modern recruitment platform with a React frontend and FastAPI backend.

## Project Structure

```
Final/
├── backend/          # FastAPI backend server
│   ├── main.py       # Main API server
│   ├── data_store.py # In-memory data storage
│   ├── seed_data.py  # Sample data
│   └── requirements.txt
└── frontend/         # React + Vite frontend
    ├── src/
    └── package.json
```

## Prerequisites

- **Python 3.8+** for backend
- **Node.js 18+** for frontend

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the server
chmod +x start.sh
./start.sh

# Or manually:
uvicorn main:app --reload
```

The backend will run on **http://localhost:8000**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The frontend will run on **http://localhost:5173**

## Features

### For HR Users
- **Dashboard**: View recruitment metrics and analytics
- **Jobs**: Create and manage job postings
- **Candidates**: Track and manage candidate applications
- View recruitment funnel and statistics

### For Candidates
- **Browse Jobs**: View available positions
- **Apply**: Submit applications with resume upload
- **Track Applications**: Monitor application status

## API Endpoints

### Candidates
- `GET /candidates` - List all candidates
- `POST /candidate` - Add new candidate
- `PATCH /candidate/{id}/status` - Update candidate status
- `POST /candidate/{id}/resume` - Upload resume

### Jobs
- `GET /jobs` - List all jobs
- `POST /job` - Create new job

### Applications
- `POST /apply` - Apply to a job
- `POST /score` - Score a candidate
- `GET /job/{id}/rankings` - Get ranked candidates for a job

## Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Uvicorn** - ASGI server
- **CORS** - Enabled for frontend communication

### Frontend
- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **TailwindCSS** - Styling
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Development Notes

- **Data Storage**: Currently using in-memory storage (data resets on server restart)
- **CORS**: Configured for `localhost:5173`
- **Hot Reload**: Both frontend and backend support hot reload during development

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:8000
```

## Future Enhancements

- Database integration (PostgreSQL/MongoDB)
- User authentication and authorization
- Email notifications
- Advanced candidate scoring with AI
- Interview scheduling
- Document management
# CapstoneITCI
# CapstoneITCI
