import asyncio
import json
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import engine, Base, SessionLocal
from backend.seed_data import seed_database
from backend.escalation_worker import escalation_worker
from backend.simulation_service import simulation_service

# Routers
from backend.routers import (
    auth, dashboard, patients, devices, events,
    telemetry, simulation, analytics, settings as settings_router
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

ws_manager = ConnectionManager()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()

    # Start automated background escalation monitor and sensor simulation
    await escalation_worker.start()
    await simulation_service.start()
    
    yield

    # Shutdown
    await escalation_worker.stop()
    await simulation_service.stop()

app = FastAPI(
    title="LifeLink AI - Health Monitoring & Emergency Response API",
    description="Connectivity-Aware Emergency Response, Deterministic Fall Detection, and Remote Health Monitoring System",
    version=settings.VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open in development for Vite / local test fixtures
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(patients.router)
app.include_router(devices.router)
app.include_router(events.router)
app.include_router(telemetry.router)
app.include_router(simulation.router)
app.include_router(analytics.router)
app.include_router(settings_router.router)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep connection alive, listen for ping/pong
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

@app.get("/")
def root():
    return {
        "project": "LifeLink AI",
        "tagline": "Detect. Verify. Connect. Confirm.",
        "status": "operational",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
