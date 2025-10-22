"""
Database Models for Mining Well Management System
SQLAlchemy ORM models for wells, drilling, completion, and production data
"""

from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from datetime import datetime

Base = declarative_base()


class Well(Base):
    """Main well registry table"""
    __tablename__ = 'wells'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_name = Column(String(100), unique=True, nullable=False)
    well_number = Column(String(50), unique=True)
    well_type = Column(String(50))  # Exploration, Development, Injection, etc.

    # Location
    latitude = Column(Float)
    longitude = Column(Float)
    surface_elevation = Column(Float)  # meters

    # Dates
    spud_date = Column(DateTime)
    completion_date = Column(DateTime)
    first_production_date = Column(DateTime)

    # Status
    well_status = Column(String(50))  # Drilling, Completed, Producing, Abandoned, etc.
    current_operator = Column(String(100))

    # Additional info
    field_name = Column(String(100))
    region = Column(String(100))
    notes = Column(Text)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    surveys = relationship("Survey", back_populates="well", cascade="all, delete-orphan")
    drilling_records = relationship("DrillingRecord", back_populates="well", cascade="all, delete-orphan")
    well_logs = relationship("WellLog", back_populates="well", cascade="all, delete-orphan")
    completions = relationship("Completion", back_populates="well", cascade="all, delete-orphan")
    production_records = relationship("ProductionRecord", back_populates="well", cascade="all, delete-orphan")


class Survey(Base):
    """Directional survey data"""
    __tablename__ = 'surveys'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    measured_depth = Column(Float, nullable=False)  # MD (meters)
    inclination = Column(Float, nullable=False)  # degrees
    azimuth = Column(Float, nullable=False)  # degrees

    # Calculated values (from welleng)
    tvd = Column(Float)  # True Vertical Depth
    northing = Column(Float)  # Y offset
    easting = Column(Float)  # X offset
    dogleg_severity = Column(Float)  # deg/30m

    survey_date = Column(DateTime)
    survey_type = Column(String(50))  # MWD, Gyro, etc.

    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("Well", back_populates="surveys")


class DrillingRecord(Base):
    """Daily drilling records"""
    __tablename__ = 'drilling_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    date = Column(DateTime, nullable=False)
    depth_in = Column(Float)  # Start depth (meters)
    depth_out = Column(Float)  # End depth (meters)

    # Drilling parameters
    rop = Column(Float)  # Rate of Penetration (m/hr)
    rpm = Column(Float)  # Rotations per minute
    wob = Column(Float)  # Weight on Bit (kN)
    torque = Column(Float)  # kN.m
    flow_rate = Column(Float)  # l/min
    spp = Column(Float)  # Standpipe Pressure (bar)

    # Mud properties
    mud_weight = Column(Float)  # kg/l
    mud_viscosity = Column(Float)  # cP
    mud_temperature = Column(Float)  # Celsius

    # Operations
    operation_type = Column(String(100))  # Drilling, Tripping, Circulating, etc.
    hours_drilling = Column(Float)
    hours_non_productive = Column(Float)

    # Bit info
    bit_type = Column(String(100))
    bit_size = Column(Float)  # inches

    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("Well", back_populates="drilling_records")


class WellLog(Base):
    """Well logging data (LAS files)"""
    __tablename__ = 'well_logs'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    log_name = Column(String(100), nullable=False)
    log_type = Column(String(50))  # Gamma Ray, Resistivity, Neutron, Density, etc.

    measured_depth_start = Column(Float)
    measured_depth_end = Column(Float)

    file_path = Column(String(500))  # Path to LAS file
    run_date = Column(DateTime)
    logging_company = Column(String(100))

    # Formation tops
    formation_name = Column(String(100))
    top_depth = Column(Float)

    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("Well", back_populates="well_logs")


class Completion(Base):
    """Well completion data"""
    __tablename__ = 'completions'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    completion_type = Column(String(100))  # Open Hole, Cased Hole, etc.
    completion_date = Column(DateTime)

    # Casing data
    casing_size = Column(Float)  # inches
    casing_grade = Column(String(50))  # J55, K55, N80, etc.
    casing_weight = Column(Float)  # kg/m
    casing_depth = Column(Float)  # meters

    # Tubing data
    tubing_size = Column(Float)  # inches
    tubing_grade = Column(String(50))
    tubing_depth = Column(Float)  # meters

    # Cementing
    cement_top = Column(Float)  # meters
    cement_volume = Column(Float)  # m3
    cement_type = Column(String(100))

    # Perforation
    perf_top = Column(Float)  # meters
    perf_bottom = Column(Float)  # meters
    perf_density = Column(Float)  # shots per meter

    completion_fluid = Column(String(100))
    completion_fluid_density = Column(Float)  # kg/l

    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("Well", back_populates="completions")


class ProductionRecord(Base):
    """Daily production records"""
    __tablename__ = 'production_records'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    date = Column(DateTime, nullable=False)

    # Production rates
    oil_rate = Column(Float)  # m3/day
    gas_rate = Column(Float)  # m3/day
    water_rate = Column(Float)  # m3/day

    # Pressures
    tubing_head_pressure = Column(Float)  # bar
    casing_head_pressure = Column(Float)  # bar

    # Temperatures
    wellhead_temperature = Column(Float)  # Celsius

    # Choke size
    choke_size = Column(Float)  # mm

    # Well test data
    is_well_test = Column(Boolean, default=False)
    test_duration = Column(Float)  # hours

    comments = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    well = relationship("Well", back_populates="production_records")


class GeomechanicsData(Base):
    """Geomechanics analysis data"""
    __tablename__ = 'geomechanics_data'

    id = Column(Integer, primary_key=True, autoincrement=True)
    well_id = Column(Integer, ForeignKey('wells.id'), nullable=False)

    depth = Column(Float, nullable=False)  # meters

    # Pore pressure
    pore_pressure = Column(Float)  # bar
    pore_pressure_gradient = Column(Float)  # bar/m

    # Fracture gradient
    fracture_pressure = Column(Float)  # bar
    fracture_gradient = Column(Float)  # bar/m

    # Stresses
    overburden_stress = Column(Float)  # bar
    min_horizontal_stress = Column(Float)  # bar
    max_horizontal_stress = Column(Float)  # bar

    # Rock properties
    ucs = Column(Float)  # Unconfined Compressive Strength (MPa)
    youngs_modulus = Column(Float)  # GPa
    poissons_ratio = Column(Float)

    # Stability
    mud_weight_min = Column(Float)  # kg/l (for stability)
    mud_weight_max = Column(Float)  # kg/l (for fracture)

    created_at = Column(DateTime, default=datetime.utcnow)


# Database initialization functions
def init_db(db_path='sqlite:///database/wells.db'):
    """Initialize the database"""
    engine = create_engine(db_path, echo=False)
    Base.metadata.create_all(engine)
    return engine


def get_session(engine):
    """Get a database session"""
    Session = sessionmaker(bind=engine)
    return Session()
