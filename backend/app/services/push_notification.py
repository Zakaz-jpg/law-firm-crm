from __future__ import annotations
import json
import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)

_firebase_app = None


def _get_firebase():
    global _firebase_app
    if _firebase_app is not None:
        return _firebase_app

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Prod: JSON-строка из env var FIREBASE_CREDENTIALS_JSON
        if settings.FIREBASE_CREDENTIALS_JSON:
            cred = credentials.Certificate(json.loads(settings.FIREBASE_CREDENTIALS_JSON))
        else:
            cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
            if not cred_path.exists():
                logger.warning("Firebase credentials not found, push notifications disabled")
                return None
            cred = credentials.Certificate(str(cred_path))

        _firebase_app = firebase_admin.initialize_app(cred)
        logger.info("Firebase initialized OK")
        return _firebase_app
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        return None


def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> None:
    if not tokens:
        return

    app = _get_firebase()
    if app is None:
        logger.info(f"[PUSH SKIPPED] title={title!r} body={body!r} tokens={tokens}")
        return

    try:
        from firebase_admin import messaging
        message = messaging.MulticastMessage(
            tokens=tokens,
            notification=messaging.Notification(title=title, body=body),
            data={k: str(v) for k, v in (data or {}).items()},
        )
        response = messaging.send_each_for_multicast(message)
        logger.info(f"Push sent: {response.success_count} ok, {response.failure_count} failed")
    except Exception as e:
        logger.error(f"Push send error: {e}")
