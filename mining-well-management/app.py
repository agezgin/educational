"""
Mining Well Management System
Main Streamlit Application

Professional well management system for mining operations
featuring trajectory planning, drilling operations, well logging,
geomechanics, completion tracking, and production monitoring.
"""

import streamlit as st
import pandas as pd
from datetime import datetime
import os
import sys

# Add modules to path
sys.path.append(os.path.dirname(__file__))

from database.models import init_db, get_session
from modules import (
    well_registry,
    trajectory,
    drilling,
    logging as well_logging,
    geomech,
    completion,
    production,
    reporting,
    advanced_drilling
)

# Page configuration
st.set_page_config(
    page_title="Mining Well Management System",
    page_icon="⛏️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 2.5rem;
        font-weight: bold;
        color: #1f77b4;
        text-align: center;
        padding: 1rem;
        background: linear-gradient(90deg, #e8f4f8 0%, #ffffff 100%);
        border-radius: 10px;
        margin-bottom: 2rem;
    }
    .metric-card {
        background-color: #f0f2f6;
        padding: 1rem;
        border-radius: 8px;
        border-left: 4px solid #1f77b4;
    }
    .stTabs [data-baseweb="tab-list"] {
        gap: 2px;
    }
    .stTabs [data-baseweb="tab"] {
        padding: 10px 20px;
        background-color: #f0f2f6;
    }
</style>
""", unsafe_allow_html=True)

# Initialize database
@st.cache_resource
def initialize_database():
    """Initialize database connection"""
    db_path = os.path.join(os.path.dirname(__file__), 'database', 'wells.db')
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    engine = init_db(f'sqlite:///{db_path}')
    return engine

# Initialize session state
if 'selected_well_id' not in st.session_state:
    st.session_state.selected_well_id = None

if 'db_engine' not in st.session_state:
    st.session_state.db_engine = initialize_database()


def main():
    """Main application"""

    # Header
    st.markdown('<div class="main-header">⛏️ Mining Well Management System</div>', unsafe_allow_html=True)

    # Sidebar
    with st.sidebar:
        st.image("https://via.placeholder.com/300x100/1f77b4/ffffff?text=Well+Management", use_column_width=True)
        st.markdown("---")

        # Module selection
        st.subheader("📋 Navigation")

        module = st.radio(
            "Select Module:",
            [
                "🏠 Dashboard",
                "📝 Well Registry",
                "📐 Trajectory & Survey",
                "⚙️ Drilling Operations",
                "🚀 Advanced Drilling",
                "📊 Well Logging",
                "🔬 Geomechanics",
                "🔧 Completion",
                "📈 Production",
                "📑 Reporting"
            ],
            label_visibility="collapsed"
        )

        st.markdown("---")

        # Well selector
        st.subheader("🎯 Quick Select Well")
        session = get_session(st.session_state.db_engine)

        try:
            from database.models import Well
            wells = session.query(Well).all()

            if wells:
                well_names = ["-- Select Well --"] + [w.well_name for w in wells]
                selected_well = st.selectbox("Well:", well_names)

                if selected_well != "-- Select Well --":
                    well = session.query(Well).filter_by(well_name=selected_well).first()
                    if well:
                        st.session_state.selected_well_id = well.id
                        st.success(f"✓ {well.well_name}")
                        st.caption(f"Status: {well.well_status}")
            else:
                st.info("No wells registered yet")
        finally:
            session.close()

        st.markdown("---")
        st.caption("v1.0.0 | Professional Well Management")

    # Main content area
    if module == "🏠 Dashboard":
        show_dashboard()

    elif module == "📝 Well Registry":
        well_registry.show()

    elif module == "📐 Trajectory & Survey":
        trajectory.show()

    elif module == "⚙️ Drilling Operations":
        drilling.show()

    elif module == "🚀 Advanced Drilling":
        advanced_drilling.show()

    elif module == "📊 Well Logging":
        well_logging.show()

    elif module == "🔬 Geomechanics":
        geomech.show()

    elif module == "🔧 Completion":
        completion.show()

    elif module == "📈 Production":
        production.show()

    elif module == "📑 Reporting":
        reporting.show()


def show_dashboard():
    """Main dashboard with KPIs and overview"""

    st.header("📊 Operations Dashboard")

    session = get_session(st.session_state.db_engine)

    try:
        from database.models import Well, DrillingRecord, ProductionRecord

        # KPI metrics
        col1, col2, col3, col4 = st.columns(4)

        total_wells = session.query(Well).count()
        active_wells = session.query(Well).filter_by(well_status='Producing').count()
        drilling_wells = session.query(Well).filter_by(well_status='Drilling').count()

        with col1:
            st.metric("Total Wells", total_wells, help="Total registered wells")

        with col2:
            st.metric("Active Wells", active_wells, help="Currently producing wells")

        with col3:
            st.metric("Drilling", drilling_wells, help="Wells currently being drilled")

        with col4:
            completion_rate = f"{(active_wells/total_wells*100):.1f}%" if total_wells > 0 else "0%"
            st.metric("Completion Rate", completion_rate)

        st.markdown("---")

        # Recent activity
        col_left, col_right = st.columns(2)

        with col_left:
            st.subheader("🆕 Recent Wells")
            wells = session.query(Well).order_by(Well.created_at.desc()).limit(5).all()

            if wells:
                well_data = []
                for w in wells:
                    well_data.append({
                        'Well Name': w.well_name,
                        'Type': w.well_type or 'N/A',
                        'Status': w.well_status or 'N/A',
                        'Spud Date': w.spud_date.strftime('%Y-%m-%d') if w.spud_date else 'N/A'
                    })
                st.dataframe(pd.DataFrame(well_data), use_container_width=True, hide_index=True)
            else:
                st.info("No wells registered yet. Go to Well Registry to add wells.")

        with col_right:
            st.subheader("📈 Well Status Distribution")

            # Get status counts
            status_query = session.query(
                Well.well_status,
                Well.id
            ).all()

            if status_query:
                status_counts = {}
                for status, _ in status_query:
                    status = status or 'Unknown'
                    status_counts[status] = status_counts.get(status, 0) + 1

                import plotly.graph_objects as go

                fig = go.Figure(data=[go.Pie(
                    labels=list(status_counts.keys()),
                    values=list(status_counts.values()),
                    hole=.3
                )])

                fig.update_layout(
                    showlegend=True,
                    height=300,
                    margin=dict(l=20, r=20, t=20, b=20)
                )

                st.plotly_chart(fig, use_container_width=True)
            else:
                st.info("No data available")

        st.markdown("---")

        # Map view
        st.subheader("🗺️ Well Locations")

        wells_with_location = session.query(Well).filter(
            Well.latitude.isnot(None),
            Well.longitude.isnot(None)
        ).all()

        if wells_with_location:
            from utils.visualizations import create_wells_map
            well_map = create_wells_map(wells_with_location)

            from streamlit_folium import folium_static
            folium_static(well_map, width=1200, height=500)
        else:
            st.info("No wells with location data. Add GPS coordinates in Well Registry.")

    finally:
        session.close()


if __name__ == "__main__":
    main()
