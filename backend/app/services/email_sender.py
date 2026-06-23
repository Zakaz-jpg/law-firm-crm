import smtplib
import os
import logging
from email.mime.text import MIMEText

log = logging.getLogger(__name__)


def send_code(to_email: str, code: str) -> bool:
    host = os.environ.get("SMTP_HOST", "smtp.mail.ru")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "")
    password = os.environ.get("SMTP_PASS", "")
    from_email = os.environ.get("SMTP_FROM", user)

    if not user or not password:
        log.warning("SMTP not configured. Code for %s: %s", to_email, code)
        return False

    body = (
        f"Ваш код для входа в LawCRM: {code}\n\n"
        f"Код действителен 10 минут.\n"
        f"Если вы не запрашивали код — проигнорируйте это письмо."
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f"Код входа в LawCRM: {code}"
    msg["From"] = from_email
    msg["To"] = to_email

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.ehlo()
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(from_email, [to_email], msg.as_string())
        return True
    except Exception as e:
        log.error("Failed to send email to %s: %s", to_email, e)
        return False
