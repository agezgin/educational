"""
Trajectory & Survey Module
Well trajectory planning and survey management using welleng
"""

import streamlit as st
import pandas as pd
import numpy as np
from datetime import datetime
from database.models import Well, Survey, get_session

try:
    import welleng as we
    WELLENG_AVAILABLE = True
except ImportError:
    WELLENG_AVAILABLE = False
    st.warning("welleng package not installed. Install with: pip install welleng")


def show():
    """Main trajectory interface"""

    st.header("📐 Trajectory & Survey Management")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📊 Survey Data", "➕ Add Survey", "📈 Trajectory Plot", "🧮 Calculations", "📄 Export"])

    with tabs[0]:
        show_survey_data()

    with tabs[1]:
        add_survey()

    with tabs[2]:
        plot_trajectory()

    with tabs[3]:
        show_calculations()

    with tabs[4]:
        export_survey()


def show_survey_data():
    """Display survey data table"""

    st.subheader("Survey Data")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        surveys = session.query(Survey).filter_by(well_id=well.id).order_by(Survey.measured_depth).all()

        if surveys:
            survey_data = []
            for s in surveys:
                survey_data.append({
                    'MD (m)': f"{s.measured_depth:.2f}",
                    'Inc (°)': f"{s.inclination:.2f}",
                    'Azi (°)': f"{s.azimuth:.2f}",
                    'TVD (m)': f"{s.tvd:.2f}" if s.tvd else 'N/A',
                    'Northing (m)': f"{s.northing:.2f}" if s.northing else 'N/A',
                    'Easting (m)': f"{s.easting:.2f}" if s.easting else 'N/A',
                    'DLS (°/30m)': f"{s.dogleg_severity:.2f}" if s.dogleg_severity else 'N/A',
                    'Type': s.survey_type or 'N/A',
                    'Date': s.survey_date.strftime('%Y-%m-%d') if s.survey_date else 'N/A'
                })

            df = pd.DataFrame(survey_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Statistics
            col1, col2, col3, col4 = st.columns(4)

            with col1:
                st.metric("Total Surveys", len(surveys))

            with col2:
                max_md = max(s.measured_depth for s in surveys)
                st.metric("Max MD (m)", f"{max_md:.2f}")

            with col3:
                if surveys[-1].tvd:
                    st.metric("Final TVD (m)", f"{surveys[-1].tvd:.2f}")

            with col4:
                max_inc = max(s.inclination for s in surveys)
                st.metric("Max Inc (°)", f"{max_inc:.2f}")

        else:
            st.info("No survey data available. Add surveys using 'Add Survey' tab.")

    finally:
        session.close()


def add_survey():
    """Add survey points"""

    st.subheader("Add Survey Data")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Adding survey for: **{well.well_name}**")

        input_method = st.radio("Input Method:", ["Single Point", "Bulk Import (CSV)", "Manual Calculation"])

        if input_method == "Single Point":
            add_single_survey(session, well)

        elif input_method == "Bulk Import (CSV)":
            bulk_import_survey(session, well)

        elif input_method == "Manual Calculation":
            manual_calculation(session, well)

    finally:
        session.close()


def add_single_survey(session, well):
    """Add single survey point"""

    with st.form("add_survey_form"):
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Survey Measurements**")
            md = st.number_input("Measured Depth (m) *", min_value=0.0, value=0.0, format="%.2f")
            inc = st.number_input("Inclination (°) *", min_value=0.0, max_value=180.0, value=0.0, format="%.2f")
            azi = st.number_input("Azimuth (°) *", min_value=0.0, max_value=360.0, value=0.0, format="%.2f")

        with col2:
            st.markdown("**Survey Information**")
            survey_type = st.selectbox("Survey Type", ["MWD", "Gyro", "Magnetic", "Other"])
            survey_date = st.date_input("Survey Date", value=datetime.now())

        auto_calculate = st.checkbox("Auto-calculate TVD, Northing, Easting using welleng", value=True)

        submitted = st.form_submit_button("➕ Add Survey Point")

        if submitted:
            if md == 0.0 and inc == 0.0:
                st.error("Please enter valid MD and inclination values")
                return

            try:
                # Calculate trajectory if enabled
                tvd, northing, easting, dls = None, None, None, None

                if auto_calculate and WELLENG_AVAILABLE:
                    # Get previous surveys
                    prev_surveys = session.query(Survey).filter_by(well_id=well.id).order_by(Survey.measured_depth).all()

                    md_list = [s.measured_depth for s in prev_surveys] + [md]
                    inc_list = [s.inclination for s in prev_surveys] + [inc]
                    azi_list = [s.azimuth for s in prev_surveys] + [azi]

                    # Calculate using welleng minimum curvature
                    try:
                        survey = we.survey.Survey(
                            md=md_list,
                            inc=inc_list,
                            azi=azi_list,
                            deg=True
                        )

                        tvd = survey.tvd[-1]
                        northing = survey.n[-1]
                        easting = survey.e[-1]

                        # Calculate dogleg severity
                        if len(survey.dogleg) > 0:
                            dls = survey.dogleg[-1]

                    except Exception as e:
                        st.warning(f"welleng calculation failed: {str(e)}")

                # Create new survey
                new_survey = Survey(
                    well_id=well.id,
                    measured_depth=md,
                    inclination=inc,
                    azimuth=azi,
                    tvd=tvd,
                    northing=northing,
                    easting=easting,
                    dogleg_severity=dls,
                    survey_type=survey_type,
                    survey_date=datetime.combine(survey_date, datetime.min.time())
                )

                session.add(new_survey)
                session.commit()

                st.success(f"✅ Survey point added at MD {md}m")

            except Exception as e:
                session.rollback()
                st.error(f"Error adding survey: {str(e)}")


def bulk_import_survey(session, well):
    """Bulk import from CSV"""

    st.markdown("**CSV Format:** MD, Inc, Azi (with header)")
    st.caption("Example: MD,Inc,Azi\\n0,0,0\\n100,5,45\\n200,10,90")

    uploaded_file = st.file_uploader("Upload CSV file", type=['csv'])

    if uploaded_file:
        try:
            df = pd.read_csv(uploaded_file)

            required_cols = ['MD', 'Inc', 'Azi']
            if not all(col in df.columns for col in required_cols):
                st.error(f"CSV must have columns: {', '.join(required_cols)}")
                return

            st.write("Preview:")
            st.dataframe(df.head(), use_container_width=True)

            if st.button("📥 Import All Points"):
                # Calculate trajectory using welleng
                if WELLENG_AVAILABLE:
                    try:
                        survey = we.survey.Survey(
                            md=df['MD'].values,
                            inc=df['Inc'].values,
                            azi=df['Azi'].values,
                            deg=True
                        )

                        df['TVD'] = survey.tvd
                        df['Northing'] = survey.n
                        df['Easting'] = survey.e
                        df['DLS'] = survey.dogleg

                    except Exception as e:
                        st.warning(f"welleng calculation failed: {str(e)}")
                        df['TVD'] = None
                        df['Northing'] = None
                        df['Easting'] = None
                        df['DLS'] = None
                else:
                    df['TVD'] = None
                    df['Northing'] = None
                    df['Easting'] = None
                    df['DLS'] = None

                # Insert into database
                for idx, row in df.iterrows():
                    new_survey = Survey(
                        well_id=well.id,
                        measured_depth=row['MD'],
                        inclination=row['Inc'],
                        azimuth=row['Azi'],
                        tvd=row['TVD'] if pd.notna(row['TVD']) else None,
                        northing=row['Northing'] if pd.notna(row['Northing']) else None,
                        easting=row['Easting'] if pd.notna(row['Easting']) else None,
                        dogleg_severity=row['DLS'] if pd.notna(row['DLS']) else None,
                        survey_type='Imported',
                        survey_date=datetime.now()
                    )
                    session.add(new_survey)

                session.commit()
                st.success(f"✅ Imported {len(df)} survey points!")

        except Exception as e:
            session.rollback()
            st.error(f"Error importing CSV: {str(e)}")


def manual_calculation(session, well):
    """Manual trajectory calculation"""

    st.markdown("**Enter survey stations for trajectory calculation**")

    num_stations = st.number_input("Number of stations:", min_value=2, max_value=50, value=3)

    md_values = []
    inc_values = []
    azi_values = []

    cols = st.columns(3)

    with cols[0]:
        st.markdown("**MD (m)**")
    with cols[1]:
        st.markdown("**Inc (°)**")
    with cols[2]:
        st.markdown("**Azi (°)**")

    for i in range(num_stations):
        cols = st.columns(3)
        with cols[0]:
            md = st.number_input(f"MD {i+1}", value=float(i*100), key=f"md_{i}", label_visibility="collapsed")
            md_values.append(md)
        with cols[1]:
            inc = st.number_input(f"Inc {i+1}", value=0.0, key=f"inc_{i}", label_visibility="collapsed")
            inc_values.append(inc)
        with cols[2]:
            azi = st.number_input(f"Azi {i+1}", value=0.0, key=f"azi_{i}", label_visibility="collapsed")
            azi_values.append(azi)

    if st.button("🧮 Calculate & Save"):
        if not WELLENG_AVAILABLE:
            st.error("welleng package not available")
            return

        try:
            survey = we.survey.Survey(
                md=md_values,
                inc=inc_values,
                azi=azi_values,
                deg=True
            )

            # Display results
            results = pd.DataFrame({
                'MD': md_values,
                'Inc': inc_values,
                'Azi': azi_values,
                'TVD': survey.tvd,
                'Northing': survey.n,
                'Easting': survey.e,
                'DLS': survey.dogleg
            })

            st.write("Calculated Trajectory:")
            st.dataframe(results, use_container_width=True, hide_index=True)

            # Save to database
            for idx, row in results.iterrows():
                new_survey = Survey(
                    well_id=well.id,
                    measured_depth=row['MD'],
                    inclination=row['Inc'],
                    azimuth=row['Azi'],
                    tvd=row['TVD'],
                    northing=row['Northing'],
                    easting=row['Easting'],
                    dogleg_severity=row['DLS'],
                    survey_type='Calculated',
                    survey_date=datetime.now()
                )
                session.add(new_survey)

            session.commit()
            st.success(f"✅ Saved {len(results)} calculated points!")

        except Exception as e:
            session.rollback()
            st.error(f"Calculation error: {str(e)}")


def plot_trajectory():
    """3D trajectory visualization"""

    st.subheader("Trajectory Visualization")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        surveys = session.query(Survey).filter_by(well_id=well.id).order_by(Survey.measured_depth).all()

        if not surveys or len(surveys) < 2:
            st.info("Need at least 2 survey points for trajectory plot")
            return

        # Extract data
        md = [s.measured_depth for s in surveys]
        tvd = [s.tvd if s.tvd else 0 for s in surveys]
        northing = [s.northing if s.northing else 0 for s in surveys]
        easting = [s.easting if s.easting else 0 for s in surveys]

        import plotly.graph_objects as go

        # 3D trajectory plot
        fig = go.Figure(data=[go.Scatter3d(
            x=easting,
            y=northing,
            z=[-t for t in tvd],  # Negative for depth
            mode='lines+markers',
            marker=dict(size=5, color=md, colorscale='Viridis', colorbar=dict(title="MD (m)")),
            line=dict(color='blue', width=3),
            text=[f"MD: {m:.1f}m<br>TVD: {t:.1f}m" for m, t in zip(md, tvd)],
            hoverinfo='text'
        )])

        fig.update_layout(
            title=f"3D Well Trajectory - {well.well_name}",
            scene=dict(
                xaxis_title="Easting (m)",
                yaxis_title="Northing (m)",
                zaxis_title="TVD (m)",
                aspectmode='data'
            ),
            height=600
        )

        st.plotly_chart(fig, use_container_width=True)

        # Vertical section
        fig2 = go.Figure()
        fig2.add_trace(go.Scatter(
            x=np.sqrt(np.array(northing)**2 + np.array(easting)**2),
            y=tvd,
            mode='lines+markers',
            name='Trajectory',
            marker=dict(size=8),
            line=dict(width=3)
        ))

        fig2.update_layout(
            title="Vertical Section",
            xaxis_title="Horizontal Displacement (m)",
            yaxis_title="TVD (m)",
            yaxis=dict(autorange='reversed'),
            height=500
        )

        st.plotly_chart(fig2, use_container_width=True)

    finally:
        session.close()


def show_calculations():
    """Trajectory calculations and analysis"""

    st.subheader("Trajectory Calculations")

    st.info("Advanced trajectory calculations using welleng")

    # Placeholder for advanced calculations
    st.markdown("""
    **Available Calculations:**
    - Minimum Curvature Method
    - Dogleg Severity
    - Build/Turn Rates
    - Well Clearance Analysis
    - Torque & Drag (requires additional parameters)
    """)


def export_survey():
    """Export survey data"""

    st.subheader("Export Survey Data")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        surveys = session.query(Survey).filter_by(well_id=well.id).order_by(Survey.measured_depth).all()

        if not surveys:
            st.info("No survey data to export")
            return

        # Prepare data
        survey_data = []
        for s in surveys:
            survey_data.append({
                'MD': s.measured_depth,
                'Inc': s.inclination,
                'Azi': s.azimuth,
                'TVD': s.tvd if s.tvd else 0,
                'Northing': s.northing if s.northing else 0,
                'Easting': s.easting if s.easting else 0,
                'DLS': s.dogleg_severity if s.dogleg_severity else 0
            })

        df = pd.DataFrame(survey_data)

        st.write("Preview:")
        st.dataframe(df, use_container_width=True, hide_index=True)

        # Export options
        csv = df.to_csv(index=False).encode('utf-8')
        st.download_button(
            label="📥 Download as CSV",
            data=csv,
            file_name=f"{well.well_name}_survey_{datetime.now().strftime('%Y%m%d')}.csv",
            mime="text/csv"
        )

    finally:
        session.close()
