from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.company_lawyer import CompanyLawyer
from app.models.user import User
from app.schemas.company_lawyer import CompanyLawyerCreate, CompanyLawyerUpdate, CompanyLawyerRead

router = APIRouter(prefix="/lawyers", tags=["lawyers"])


@router.get("", response_model=List[CompanyLawyerRead])
def list_lawyers(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(CompanyLawyer).order_by(CompanyLawyer.full_name).all()


@router.post("", response_model=CompanyLawyerRead, status_code=201)
def create_lawyer(data: CompanyLawyerCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lawyer = CompanyLawyer(**data.model_dump())
    db.add(lawyer)
    db.commit()
    db.refresh(lawyer)
    return lawyer


@router.patch("/{lawyer_id}", response_model=CompanyLawyerRead)
def update_lawyer(lawyer_id: int, data: CompanyLawyerUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lawyer = db.get(CompanyLawyer, lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(lawyer, k, v)
    db.commit()
    db.refresh(lawyer)
    return lawyer


@router.delete("/{lawyer_id}", status_code=204)
def delete_lawyer(lawyer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    lawyer = db.get(CompanyLawyer, lawyer_id)
    if not lawyer:
        raise HTTPException(status_code=404, detail="Юрист не найден")
    db.delete(lawyer)
    db.commit()
