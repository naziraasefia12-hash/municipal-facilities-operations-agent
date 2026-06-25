from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String
from ..database import Base


class Building(Base):
    __tablename__ = "buildings"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    address = Column(String)
    building_code = Column(String, unique=True)
    floors = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
