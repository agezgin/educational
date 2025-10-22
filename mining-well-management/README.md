# Mining Well Management System

Professional well management application for mining operations featuring trajectory planning, drilling operations tracking, well logging, geomechanics analysis, completion management, and production monitoring.

## Features

### Core Modules

1. **Well Registry**
   - Add, edit, and manage well information
   - GPS location tracking with interactive maps
   - Well status and operational data

2. **Trajectory & Survey Management** (welleng integration)
   - Directional survey data management
   - 3D trajectory visualization
   - Minimum curvature calculations
   - Dogleg severity analysis
   - Anti-collision calculations

3. **Drilling Operations**
   - Daily drilling reports
   - Rate of Penetration (ROP) analysis
   - Mud properties tracking
   - Drilling hydraulics calculations
   - Non-Productive Time (NPT) monitoring

4. **Well Logging** (lasio & welly integration)
   - LAS file import/export
   - Log curve visualization
   - Formation tops management
   - Multi-curve plotting

5. **Geomechanics Analysis**
   - Pore pressure prediction
   - Fracture gradient analysis
   - Wellbore stability calculations
   - Mud weight window determination
   - Rock mechanics properties

6. **Completion Management**
   - Casing and tubing design
   - Cementing records
   - Perforation design
   - Completion schematics

7. **Production Monitoring**
   - Daily production records
   - Well testing data
   - Performance tracking

8. **Reporting & Analytics**
   - Executive dashboards
   - Drilling performance analysis
   - Comprehensive well reports
   - Data export (CSV, Excel)

## Professional Python Packages Used

### Well Engineering
- **welleng** - Well trajectory planning, torque & drag, ISCWSA uncertainty models
- **lasio** - LAS file I/O (industry standard well log format)
- **welly** - Well data management and curve handling
- **wellpathpy** - Survey calculations

### Geomechanics
- Stresslog/WellMasterGeoMech models for pore pressure and stability

### Visualization
- **Plotly** - Interactive 3D trajectory plots and charts
- **Folium** - Interactive GPS maps with well locations
- **Matplotlib/Seaborn** - Additional plotting capabilities

### Data Management
- **SQLAlchemy** - Database ORM
- **Pandas** - Data manipulation and analysis
- **NumPy/SciPy** - Numerical calculations

## Installation

### 1. Clone the repository

```bash
git clone <repository-url>
cd mining-well-management
```

### 2. Create virtual environment

```bash
python -m venv venv

# On Linux/Mac:
source venv/bin/activate

# On Windows:
venv\Scripts\activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Run the application

```bash
streamlit run app.py
```

The application will open in your default web browser at `http://localhost:8501`

## Project Structure

```
mining-well-management/
├── app.py                      # Main Streamlit application
├── requirements.txt            # Python dependencies
├── README.md                   # This file
│
├── database/                   # Database layer
│   ├── __init__.py
│   ├── models.py              # SQLAlchemy models
│   └── wells.db               # SQLite database (created on first run)
│
├── modules/                    # Application modules
│   ├── __init__.py
│   ├── well_registry.py       # Well registration and management
│   ├── trajectory.py          # Survey and trajectory (welleng)
│   ├── drilling.py            # Drilling operations
│   ├── logging.py             # Well logging (lasio/welly)
│   ├── geomech.py             # Geomechanics analysis
│   ├── completion.py          # Completion management
│   └── reporting.py           # Reports and dashboards
│
├── utils/                      # Utility functions
│   ├── __init__.py
│   ├── calculations.py        # Engineering calculations
│   └── visualizations.py      # Plotly & Folium charts
│
└── data/                       # Data storage
    └── las_files/             # Uploaded LAS files
```

## Usage Guide

### Getting Started

1. **Add Wells**
   - Navigate to "Well Registry" → "Add New Well"
   - Enter well information (name, location, dates, etc.)
   - Add GPS coordinates for map visualization

2. **Add Survey Data**
   - Select a well from the sidebar
   - Go to "Trajectory & Survey" → "Add Survey"
   - Choose input method:
     - Single point entry
     - Bulk CSV import
     - Manual calculation using welleng

3. **Track Drilling Operations**
   - Go to "Drilling Operations" → "Add Report"
   - Enter daily drilling parameters
   - View ROP analysis and mud properties

4. **Upload Well Logs**
   - Navigate to "Well Logging" → "Upload LAS"
   - Upload LAS files (industry standard format)
   - Visualize log curves

5. **Geomechanics Analysis**
   - Go to "Geomechanics" → "Add Data"
   - Enter pore pressure and rock properties
   - View pressure profiles and mud weight windows

6. **Completion Data**
   - Navigate to "Completion" → "Add Completion"
   - Enter casing, tubing, and perforation data
   - View completion schematics

7. **Generate Reports**
   - Go to "Reporting" for dashboards and analytics
   - Export data to CSV or Excel

## Data Models

### Well
- Basic information (name, number, type, status)
- Location (GPS coordinates)
- Dates (spud, completion, first production)
- Operational data

### Survey
- Measured Depth (MD)
- Inclination (Inc)
- Azimuth (Azi)
- Calculated: TVD, Northing, Easting, DLS

### Drilling Record
- Daily drilling parameters (ROP, WOB, RPM)
- Mud properties (weight, viscosity, temperature)
- Hydraulics (flow rate, SPP, torque)
- Operations and NPT

### Well Log
- LAS file data
- Log curves
- Formation tops

### Geomechanics Data
- Pore pressure and fracture gradient
- In-situ stresses
- Rock properties (UCS, Young's modulus)
- Mud weight window

### Completion
- Casing and tubing design
- Cementing data
- Perforation intervals

### Production Record
- Daily production rates (oil, gas, water)
- Pressures and temperatures
- Well test data

## Engineering Calculations

The application includes professional engineering calculations:

- **Trajectory**: Minimum curvature method, dogleg severity
- **Drilling**: D-exponent, ROP analysis, ECD
- **Hydraulics**: Annular velocity, jet velocity, HHP
- **Geomechanics**: Pore pressure prediction, wellbore stability
- **Completion**: Burst/collapse ratings, displacement volumes

## Visualization Features

- **3D Well Trajectories** - Interactive Plotly plots
- **GPS Well Maps** - Folium maps with well locations
- **Pressure Profiles** - Pore pressure and fracture gradient
- **ROP Analysis** - Depth vs ROP charts
- **Completion Schematics** - Visual casing/tubing designs
- **Production Dashboards** - KPIs and performance metrics

## Technologies

- **Frontend**: Streamlit
- **Backend**: Python 3.8+
- **Database**: SQLite (SQLAlchemy ORM)
- **Well Engineering**: welleng, lasio, welly
- **Visualization**: Plotly, Folium, Matplotlib
- **Data Processing**: Pandas, NumPy, SciPy

## Advanced Features

### Professional Packages Integration

1. **welleng** - Industry-standard trajectory calculations
   - ISCWSA MWD Rev5 uncertainty models
   - Torque & drag analysis
   - Well clearance calculations

2. **lasio** - LAS file handling
   - Read/write industry-standard log files
   - Parse well log data

3. **Folium** - Interactive mapping
   - GPS well locations
   - Multi-layer maps
   - Custom markers and popups

## Future Enhancements

Potential additions:
- pwptemp integration for temperature simulations
- APMonitor for drilling hydraulics
- Machine learning for ROP prediction
- Real-time data integration
- Multi-user authentication
- PostgreSQL for production deployment

## Support

For issues or questions:
- Review the documentation
- Check the database models in `database/models.py`
- Refer to module-specific code in `modules/`

## License

This project is for educational and professional use.

## Contributors

Developed for mining well management operations.

---

**Version**: 1.0.0
**Last Updated**: 2025
