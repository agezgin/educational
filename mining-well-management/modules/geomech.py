"""
Geomechanics Module
Pore pressure, fracture gradient, wellbore stability analysis
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime
from database.models import Well, GeomechanicsData, get_session


def show():
    """Main geomechanics interface"""

    st.header("🔬 Geomechanics Analysis")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📊 Pressure Profile", "➕ Add Data", "📈 Stability Analysis", "🧮 Calculations"])

    with tabs[0]:
        show_pressure_profile()

    with tabs[1]:
        add_geomech_data()

    with tabs[2]:
        wellbore_stability()

    with tabs[3]:
        geomech_calculations()


def show_pressure_profile():
    """Display pore pressure and fracture gradient profile"""

    st.subheader("Pressure Profile")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        geomech_data = session.query(GeomechanicsData).filter_by(well_id=well.id).order_by(GeomechanicsData.depth).all()

        if geomech_data:
            # Create dataframe
            data_list = []
            for gd in geomech_data:
                data_list.append({
                    'Depth (m)': gd.depth,
                    'Pore Pressure (bar)': gd.pore_pressure if gd.pore_pressure else 'N/A',
                    'PP Gradient (bar/m)': gd.pore_pressure_gradient if gd.pore_pressure_gradient else 'N/A',
                    'Frac Pressure (bar)': gd.fracture_pressure if gd.fracture_pressure else 'N/A',
                    'Frac Gradient (bar/m)': gd.fracture_gradient if gd.fracture_gradient else 'N/A',
                    'MW Min (kg/l)': gd.mud_weight_min if gd.mud_weight_min else 'N/A',
                    'MW Max (kg/l)': gd.mud_weight_max if gd.mud_weight_max else 'N/A'
                })

            df = pd.DataFrame(data_list)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Pressure plot
            depths = [gd.depth for gd in geomech_data]
            pore_pressures = [gd.pore_pressure if gd.pore_pressure else 0 for gd in geomech_data]
            frac_pressures = [gd.fracture_pressure if gd.fracture_pressure else 0 for gd in geomech_data]
            overburden = [gd.overburden_stress if gd.overburden_stress else 0 for gd in geomech_data]

            fig = go.Figure()

            if any(pore_pressures):
                fig.add_trace(go.Scatter(
                    x=pore_pressures,
                    y=depths,
                    mode='lines+markers',
                    name='Pore Pressure',
                    line=dict(color='blue', width=2)
                ))

            if any(frac_pressures):
                fig.add_trace(go.Scatter(
                    x=frac_pressures,
                    y=depths,
                    mode='lines+markers',
                    name='Fracture Pressure',
                    line=dict(color='red', width=2)
                ))

            if any(overburden):
                fig.add_trace(go.Scatter(
                    x=overburden,
                    y=depths,
                    mode='lines+markers',
                    name='Overburden Stress',
                    line=dict(color='green', width=2)
                ))

            fig.update_layout(
                title="Pressure vs Depth Profile",
                xaxis_title="Pressure (bar)",
                yaxis_title="Depth (m)",
                yaxis=dict(autorange='reversed'),
                height=600,
                hovermode='x unified'
            )

            st.plotly_chart(fig, use_container_width=True)

            # Mud weight window plot
            mud_min = [gd.mud_weight_min if gd.mud_weight_min else 0 for gd in geomech_data]
            mud_max = [gd.mud_weight_max if gd.mud_weight_max else 0 for gd in geomech_data]

            if any(mud_min) and any(mud_max):
                fig2 = go.Figure()

                fig2.add_trace(go.Scatter(
                    x=mud_min,
                    y=depths,
                    mode='lines',
                    name='Min MW (Stability)',
                    line=dict(color='orange', width=2)
                ))

                fig2.add_trace(go.Scatter(
                    x=mud_max,
                    y=depths,
                    mode='lines',
                    name='Max MW (Fracture)',
                    line=dict(color='red', width=2),
                    fill='tonextx'
                ))

                fig2.update_layout(
                    title="Mud Weight Window",
                    xaxis_title="Mud Weight (kg/l)",
                    yaxis_title="Depth (m)",
                    yaxis=dict(autorange='reversed'),
                    height=500
                )

                st.plotly_chart(fig2, use_container_width=True)

        else:
            st.info("No geomechanics data available. Add data using 'Add Data' tab.")

    finally:
        session.close()


def add_geomech_data():
    """Add geomechanics data"""

    st.subheader("Add Geomechanics Data")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Adding data for: **{well.well_name}**")

        with st.form("add_geomech_form"):
            depth = st.number_input("Depth (m) *", min_value=0.0, value=0.0, format="%.2f")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**Pore Pressure**")
                pore_pressure = st.number_input("Pore Pressure (bar)", value=0.0, format="%.2f")
                pp_gradient = st.number_input("PP Gradient (bar/m)", value=0.0, format="%.4f")

                st.markdown("**Fracture**")
                frac_pressure = st.number_input("Fracture Pressure (bar)", value=0.0, format="%.2f")
                frac_gradient = st.number_input("Frac Gradient (bar/m)", value=0.0, format="%.4f")

            with col2:
                st.markdown("**Stresses**")
                overburden = st.number_input("Overburden Stress (bar)", value=0.0, format="%.2f")
                min_hz_stress = st.number_input("Min Horizontal Stress (bar)", value=0.0, format="%.2f")
                max_hz_stress = st.number_input("Max Horizontal Stress (bar)", value=0.0, format="%.2f")

            with col3:
                st.markdown("**Rock Properties**")
                ucs = st.number_input("UCS (MPa)", value=0.0, format="%.2f", help="Unconfined Compressive Strength")
                youngs_mod = st.number_input("Young's Modulus (GPa)", value=0.0, format="%.2f")
                poissons = st.number_input("Poisson's Ratio", value=0.0, format="%.3f")

                st.markdown("**Mud Weight Window**")
                mw_min = st.number_input("MW Min (kg/l)", value=0.0, format="%.2f")
                mw_max = st.number_input("MW Max (kg/l)", value=0.0, format="%.2f")

            submitted = st.form_submit_button("➕ Add Geomechanics Data", use_container_width=True)

            if submitted:
                if depth == 0:
                    st.error("Please enter valid depth")
                    return

                try:
                    new_data = GeomechanicsData(
                        well_id=well.id,
                        depth=depth,
                        pore_pressure=pore_pressure if pore_pressure > 0 else None,
                        pore_pressure_gradient=pp_gradient if pp_gradient > 0 else None,
                        fracture_pressure=frac_pressure if frac_pressure > 0 else None,
                        fracture_gradient=frac_gradient if frac_gradient > 0 else None,
                        overburden_stress=overburden if overburden > 0 else None,
                        min_horizontal_stress=min_hz_stress if min_hz_stress > 0 else None,
                        max_horizontal_stress=max_hz_stress if max_hz_stress > 0 else None,
                        ucs=ucs if ucs > 0 else None,
                        youngs_modulus=youngs_mod if youngs_mod > 0 else None,
                        poissons_ratio=poissons if poissons > 0 else None,
                        mud_weight_min=mw_min if mw_min > 0 else None,
                        mud_weight_max=mw_max if mw_max > 0 else None
                    )

                    session.add(new_data)
                    session.commit()

                    st.success(f"✅ Geomechanics data added at {depth}m")

                except Exception as e:
                    session.rollback()
                    st.error(f"Error adding data: {str(e)}")

    finally:
        session.close()


def wellbore_stability():
    """Wellbore stability analysis"""

    st.subheader("Wellbore Stability Analysis")

    st.info("Wellbore stability analysis using geomechanical models")

    st.markdown("""
    **Stability Calculations:**
    - Coulomb Failure Criterion
    - Mohr-Coulomb Analysis
    - Drucker-Prager Model
    - Wellbore Breakout Prediction
    - Lost Circulation Prediction

    **Note:** Advanced stability calculations require rock properties and in-situ stress data.
    Consider integrating Stresslog or WellMasterGeoMech package.
    """)


def geomech_calculations():
    """Geomechanics calculations"""

    st.subheader("Geomechanics Calculations")

    st.markdown("### Pore Pressure from D-exponent")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Input Parameters**")
        rop = st.number_input("ROP (m/hr)", value=10.0, format="%.2f")
        rpm = st.number_input("RPM", value=100.0, format="%.1f")
        wob = st.number_input("WOB (kN)", value=100.0, format="%.1f")
        bit_diameter = st.number_input("Bit Diameter (mm)", value=215.9, format="%.1f")
        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f")
        depth = st.number_input("Depth (m)", value=1000.0, format="%.1f")

    with col2:
        if st.button("Calculate D-exponent"):
            # D-exponent calculation
            # D = log(ROP/(60*RPM)) / log(12*WOB/(1000*bit_diameter))

            if rpm > 0 and wob > 0 and bit_diameter > 0:
                numerator = rop / (60 * rpm)
                denominator = (12 * wob) / (1000 * bit_diameter)

                if numerator > 0 and denominator > 0:
                    import math
                    d_exp = math.log10(numerator) / math.log10(denominator)

                    st.success(f"**D-exponent = {d_exp:.3f}**")

                    # Corrected D-exponent (Dc)
                    normal_gradient = 0.1  # bar/m
                    dc = d_exp * (normal_gradient / (mud_weight * 0.0981))

                    st.info(f"**Corrected D-exponent (Dc) = {dc:.3f}**")

                    st.caption("Note: D-exponent is used for pore pressure detection. Sudden changes may indicate overpressure.")
                else:
                    st.error("Invalid calculation values")
            else:
                st.error("All parameters must be greater than zero")
