from fastapi import APIRouter
from app.api.v1 import auth, cases, clients, attachments, sync

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(cases.router)
router.include_router(clients.router)
router.include_router(attachments.router)
router.include_router(sync.router)
