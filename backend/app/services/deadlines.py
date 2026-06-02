from __future__ import annotations
from datetime import date
from dateutil.relativedelta import relativedelta


def calculate_deadlines(full_decision_date: date, court_type: str | None = None) -> dict:
    """
    Рассчитывает сроки обжалования от даты получения решения в окончательной форме.

    Арбитраж:
      - Апелляция: 1 месяц
      - Кассация:  2 месяца (от той же даты, т.к. кассация считается от вступления в силу)
      - Надзор:    3 месяца

    Общая юрисдикция — те же сроки (упрощённо).
    """
    return {
        "appeal_deadline":      full_decision_date + relativedelta(months=1),
        "cassation_deadline":   full_decision_date + relativedelta(months=2),
        "supervisory_deadline": full_decision_date + relativedelta(months=3),
    }
