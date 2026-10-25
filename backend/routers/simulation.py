from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend.schemas import SimulationScenarioRequest, SimulationStatusResponse
from backend.simulation_service import simulation_service
from backend.seed_data import seed_database
from backend.security import get_current_user, User

router = APIRouter(prefix="/api/simulation", tags=["Sensor Simulation"])

@router.get("/status", response_model=SimulationStatusResponse)
def get_simulation_status():
    return {
        "is_running": simulation_service.is_running,
        "active_scenario": simulation_service.active_scenario,
        "frequency_hz": simulation_service.frequency_hz,
        "simulated_patients": 3,
        "last_tick": None
    }

@router.post("/start")
async def start_simulation():
    await simulation_service.start()
    return {"status": "started", "is_running": True}

@router.post("/pause")
async def pause_simulation():
    await simulation_service.pause()
    return {"status": "paused", "is_running": False}

@router.post("/stop")
async def stop_simulation():
    await simulation_service.stop()
    return {"status": "stopped", "is_running": False}

@router.post("/scenario")
def trigger_scenario(
    payload: SimulationScenarioRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = simulation_service.run_deterministic_scenario(
        db=db,
        scenario=payload.scenario,
        patient_id=payload.patient_id
    )
    return result

@router.post("/reset-demo")
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Resets the database back to standard demonstration seed state.
    """
    seed_database(db, force=True)
    return {"status": "success", "message": "Demo data successfully reset to clean presentation state."}
