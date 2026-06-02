from fastapi import APIRouter
from app.api.v1 import auth, cases, clients, attachments, sync, calendar, stages, lawyers, enforcement, admin

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(cases.router)
router.include_router(stages.router)
router.include_router(clients.router)
router.include_router(attachments.router)
router.include_router(sync.router)
router.include_router(calendar.router)
router.include_router(lawyers.router)
router.include_router(enforcement.router)
router.include_router(admin.router)
