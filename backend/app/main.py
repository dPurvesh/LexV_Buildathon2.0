from fastapi import FastAPI

from app.services.web3_service import blockchain_status
from app.api.v1.evidence import router as evidence_router
from app.api.v1.search import router as search_router
from app.api.v1.sharing import router as sharing_router
from app.api.v1.stats import router as stats_router
from app.api.v1.forensics import router as forensics_router
from app.api.v1.certificate import router as certificate_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI-Powered Legal & Evidence Management System")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000", "http://127.0.0.1:3001", "*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(evidence_router)
app.include_router(search_router)
app.include_router(sharing_router)
app.include_router(stats_router)
app.include_router(forensics_router)
app.include_router(certificate_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/v1/blockchain/status")
def blockchain_connection_status() -> dict:
    return blockchain_status()