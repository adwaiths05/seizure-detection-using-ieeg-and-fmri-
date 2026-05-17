# SOZ GAT Project

This project provides a full-stack application for Seizure Onset Zone (SOZ) detection using an iEEG Graph Attention Network (GAT).

## Architecture

The system is composed of two main parts:

- **[Backend](./backend/)**: A FastAPI-based Python server providing inference endpoints utilizing the trained GAT model. It handles pre-extraction of 15 iEEG features and returns SOZ probabilities.
- **[Frontend](./frontend/)**: A modern, responsive web application built with Next.js, Tailwind CSS, and Shadcn UI. It interfaces with the backend to visualize risk scores and channel predictions using robust charting and data visualization components.

## Getting Started

### Prerequisites

- Node.js (v18+)
- Python (3.9+)
- pnpm (for frontend)
- Docker & Docker Compose (optional, for containerized deployment)

### Running the Backend

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Configure environment variables by copying the example file:
   ```bash
   cp .env.example .env
   ```
5. Ensure your trained models (`soz_gat.pt` and `scaler.pkl`) are placed in `backend/saved_models/`.
6. Start the development server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
The API documentation will be available at `http://localhost:8000/docs`.

### Running the Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install dependencies using pnpm:
   ```bash
   pnpm install
   ```
3. Configure environment variables (e.g. `NEXT_PUBLIC_API_URL` pointing to the backend).
4. Start the development server:
   ```bash
   pnpm run dev
   ```
The frontend will be available at `http://localhost:3000`.

## Docker Deployment

Alternatively, you can run the entire stack using Docker:

```bash
docker-compose up --build
```
*(Ensure you have a root `docker-compose.yml` or run this within the backend directory depending on the project setup).*

## License

MIT
