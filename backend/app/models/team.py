from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from ..database import Base


class Team(Base):
    __tablename__ = "teams"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    team_code = Column(String, unique=True)
    specialty = Column(String)
    contact_email = Column(String)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
