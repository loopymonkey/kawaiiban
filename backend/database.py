from sqlalchemy import create_engine, Column, Integer, String, JSON, text
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:////tmp/pm.db")
_is_sqlite = DATABASE_URL.startswith("sqlite")
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if _is_sqlite else {},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, nullable=True, index=True)
    password_hash = Column(String, nullable=True)
    google_id = Column(String, unique=True, nullable=True, index=True)

class Board(Base):
    __tablename__ = "boards"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, unique=True)
    state_json = Column(JSON, default={})

def init_db():
    Base.metadata.create_all(bind=engine)
    if not _is_sqlite:
        return
    # Migrate existing SQLite databases that predate the email/google_id columns
    try:
        with engine.connect() as conn:
            existing = [row[1] for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()]
            for col_name, col_type in [("email", "TEXT"), ("password_hash", "TEXT"), ("google_id", "TEXT")]:
                if col_name not in existing:
                    conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type}"))
            conn.commit()
    except Exception:
        pass  # Non-critical: schema may already be up to date
