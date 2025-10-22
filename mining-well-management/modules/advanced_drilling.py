"""
Advanced Drilling Module
Advanced drilling optimization tools using sophisticated models
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import numpy as np
from database.models import Well, get_session
from utils import rop_models, hole_cleaning, advanced_calculations


def show():
    """Main advanced drilling interface"""

    st.header("🚀 Advanced Drilling Optimization")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs([
        "🎯 ROP Optimization",
        "🧹 Hole Cleaning",
        "💨 Hydraulics Analysis",
        "⚡ MSE Analysis",
        "💰 Cost Optimization"
    ])

    with tabs[0]:
        rop_optimization()

    with tabs[1]:
        hole_cleaning_analysis()

    with tabs[2]:
        hydraulics_analysis()

    with tabs[3]:
        mse_analysis()

    with tabs[4]:
        cost_optimization()


def rop_optimization():
    """ROP optimization tool"""

    st.subheader("Rate of Penetration Optimization")

    st.markdown("""
    **Optimize drilling parameters for maximum ROP using advanced models:**
    - Bourgoyne & Young model
    - Warren model
    - Maurer's specific energy
    """)

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Formation Parameters**")
        formation_strength = st.number_input("Formation Strength (MPa)", value=50.0, format="%.1f")
        depth = st.number_input("Depth (m)", value=1000.0, format="%.1f")

        st.markdown("**Bit Parameters**")
        bit_diameter = st.number_input("Bit Diameter (mm)", value=215.9, format="%.1f")
        bit_wear = st.slider("Bit Wear (0-1)", 0.0, 1.0, 0.0, 0.1)

    with col2:
        st.markdown("**Mud Parameters**")
        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f")
        flow_rate = st.number_input("Flow Rate (l/min)", value=1500.0, format="%.1f")

        st.markdown("**Optimization Range**")
        wob_min = st.number_input("Min WOB (kN)", value=50.0, format="%.1f")
        wob_max = st.number_input("Max WOB (kN)", value=200.0, format="%.1f")
        rpm_min = st.number_input("Min RPM", value=60.0, format="%.1f")
        rpm_max = st.number_input("Max RPM", value=180.0, format="%.1f")

    if st.button("🎯 Optimize Parameters", type="primary"):
        with st.spinner("Optimizing..."):
            # Optimize WOB and RPM
            optimal_wob, optimal_rpm, max_rop = rop_models.optimize_wob_rpm(
                formation_strength=formation_strength,
                bit_diameter=bit_diameter,
                flow_rate=flow_rate,
                wob_range=(wob_min, wob_max),
                rpm_range=(rpm_min, rpm_max),
                steps=15
            )

            st.success("✅ Optimization Complete!")

            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("Optimal WOB", f"{optimal_wob:.1f} kN")

            with col2:
                st.metric("Optimal RPM", f"{optimal_rpm:.0f}")

            with col3:
                st.metric("Max ROP", f"{max_rop:.2f} m/hr")

            # Create optimization surface plot
            wob_range = np.linspace(wob_min, wob_max, 20)
            rpm_range = np.linspace(rpm_min, rpm_max, 20)

            WOB, RPM = np.meshgrid(wob_range, rpm_range)
            ROP = np.zeros_like(WOB)

            for i in range(len(rpm_range)):
                for j in range(len(wob_range)):
                    ROP[i, j] = rop_models.bourgoyne_young_rop(
                        depth=depth,
                        formation_strength=formation_strength,
                        wob=WOB[i, j],
                        rpm=RPM[i, j],
                        mud_weight=mud_weight,
                        bit_diameter=bit_diameter,
                        flow_rate=flow_rate,
                        bit_wear=bit_wear
                    )

            fig = go.Figure(data=[go.Surface(x=WOB, y=RPM, z=ROP, colorscale='Viridis')])

            fig.update_layout(
                title='ROP Optimization Surface',
                scene=dict(
                    xaxis_title='WOB (kN)',
                    yaxis_title='RPM',
                    zaxis_title='ROP (m/hr)'
                ),
                height=600
            )

            st.plotly_chart(fig, use_container_width=True)


def hole_cleaning_analysis():
    """Hole cleaning analysis tool"""

    st.subheader("Hole Cleaning Analysis")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Wellbore Geometry**")
        hole_diameter = st.number_input("Hole Diameter (in)", value=8.5, format="%.2f")
        pipe_od = st.number_input("Pipe OD (in)", value=5.0, format="%.2f")
        inclination = st.number_input("Inclination (°)", value=45.0, format="%.1f")

        st.markdown("**Drilling Parameters**")
        rop = st.number_input("ROP (m/hr)", value=15.0, format="%.1f")
        flow_rate = st.number_input("Flow Rate (l/min)", value=1500.0, format="%.1f")

    with col2:
        st.markdown("**Fluid Properties**")
        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f", key="hc_mw")
        mud_viscosity = st.number_input("Mud Viscosity (cP)", value=25.0, format="%.1f")

        st.markdown("**Cuttings Properties**")
        cuttings_density = st.number_input("Cuttings Density (g/cm³)", value=2.65, format="%.2f")
        cuttings_diameter = st.number_input("Cuttings Diameter (mm)", value=5.0, format="%.1f")

    if st.button("🧹 Analyze Hole Cleaning", type="primary"):
        with st.spinner("Analyzing..."):
            # Calculate annular velocity
            dh = hole_diameter * 0.0254
            dp = pipe_od * 0.0254
            annular_area = (np.pi / 4) * (dh**2 - dp**2)
            annular_velocity = (flow_rate / 60000) / annular_area  # m/s

            # Calculate slip velocity
            slip_velocity = hole_cleaning.calculate_slip_velocity(
                cuttings_diameter, cuttings_density, mud_weight, mud_viscosity
            )

            # Calculate critical velocity
            critical_velocity = hole_cleaning.calculate_critical_transport_velocity(
                cuttings_diameter, cuttings_density, mud_weight, mud_viscosity, inclination
            )

            # Get hole cleaning analysis
            analysis = hole_cleaning.calculate_hole_cleaning_index(
                annular_velocity, critical_velocity
            )

            # Calculate cuttings concentration
            bit_diameter = hole_diameter * 25.4  # Convert to mm
            concentration = hole_cleaning.calculate_cuttings_concentration(
                rop, bit_diameter, flow_rate
            )

            # Display results
            st.markdown("### 📊 Analysis Results")

            col1, col2, col3, col4 = st.columns(4)

            with col1:
                st.metric("Annular Velocity", f"{annular_velocity:.2f} m/s")

            with col2:
                st.metric("Critical Velocity", f"{critical_velocity:.2f} m/s")

            with col3:
                st.metric("Velocity Ratio", f"{analysis['ratio']:.2f}")

            with col4:
                st.metric("Cuttings Conc.", f"{concentration:.1f}%")

            # Status indicator
            status_color = {
                'excellent': '🟢',
                'adequate': '🟡',
                'marginal': '🟠',
                'poor': '🔴'
            }.get(analysis['status'], '⚪')

            st.markdown(f"### {status_color} Status: **{analysis['status'].upper()}**")
            st.info(f"**Cleaning Efficiency:** {analysis['cleaning_efficiency']}")
            st.warning(f"**Recommendation:** {analysis['recommendation']}")

            # Flow rate optimization
            st.markdown("### 🎯 Flow Rate Optimization")

            flow_optimization = hole_cleaning.calculate_flow_rate_for_hole_cleaning(
                hole_diameter, pipe_od, rop, bit_diameter,
                cuttings_density, mud_weight, mud_viscosity, inclination
            )

            col1, col2 = st.columns(2)

            with col1:
                st.metric("Current Flow Rate", f"{flow_rate:.0f} l/min")
                st.metric("Minimum Required", f"{flow_optimization['required_minimum']:.0f} l/min")

            with col2:
                st.metric("Recommended Flow", f"{flow_optimization['recommended']:.0f} l/min")
                st.metric("Critical Velocity", f"{flow_optimization['critical_velocity']:.2f} m/s")

            if flow_rate < flow_optimization['required_minimum']:
                st.error("⚠️ Flow rate is below minimum requirement!")
            elif flow_rate < flow_optimization['recommended']:
                st.warning("⚠️ Flow rate is below recommended value")
            else:
                st.success("✅ Flow rate is adequate for hole cleaning")


def hydraulics_analysis():
    """Advanced hydraulics analysis"""

    st.subheader("Advanced Hydraulics Analysis")

    st.info("**Bingham Plastic Model** - Advanced pressure loss calculations")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Geometry**")
        hole_dia = st.number_input("Hole Diameter (in)", value=8.5, format="%.2f", key="hyd_hole")
        pipe_od = st.number_input("Pipe OD (in)", value=5.0, format="%.2f", key="hyd_pipe")
        pipe_id = st.number_input("Pipe ID (in)", value=4.276, format="%.3f")
        section_length = st.number_input("Section Length (m)", value=1000.0, format="%.1f")

        st.markdown("**Flow Parameters**")
        flow_rate = st.number_input("Flow Rate (l/min)", value=1500.0, format="%.1f", key="hyd_flow")

    with col2:
        st.markdown("**Rheology (Fann Readings)**")
        theta_600 = st.number_input("600 RPM Reading", value=60.0, format="%.1f")
        theta_300 = st.number_input("300 RPM Reading", value=35.0, format="%.1f")

        # Calculate PV and YP
        pv = advanced_calculations.calculate_plastic_viscosity(theta_600, theta_300)
        yp = advanced_calculations.calculate_yield_point(theta_600, theta_300)

        st.metric("Plastic Viscosity", f"{pv:.1f} cP")
        st.metric("Yield Point", f"{yp:.1f} lb/100ft²")

        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f", key="hyd_mw")

    if st.button("💨 Calculate Pressure Losses", type="primary"):
        with st.spinner("Calculating..."):
            # Annular pressure loss
            annular_pl = advanced_calculations.calculate_annular_pressure_loss_bingham(
                flow_rate, hole_dia, pipe_od, section_length,
                mud_weight, pv, yp
            )

            # Pipe pressure loss
            pipe_pl = advanced_calculations.calculate_pipe_pressure_loss(
                flow_rate, pipe_id, section_length, mud_weight, pv, yp
            )

            # Total pressure loss
            total_pl = annular_pl + pipe_pl

            # ECD calculation
            tvd = section_length * 0.9  # Simplified
            ecd = advanced_calculations.calculate_ecd(mud_weight, tvd, annular_pl)

            # Display results
            st.markdown("### 📊 Pressure Loss Results")

            col1, col2, col3, col4 = st.columns(4)

            with col1:
                st.metric("Annular Loss", f"{annular_pl:.2f} bar")

            with col2:
                st.metric("Pipe Loss", f"{pipe_pl:.2f} bar")

            with col3:
                st.metric("Total Loss", f"{total_pl:.2f} bar")

            with col4:
                st.metric("ECD", f"{ecd:.2f} kg/l")

            # Hydraulic horsepower
            hhp = advanced_calculations.calculate_hydraulic_horsepower(total_pl, flow_rate)

            st.metric("Hydraulic Horsepower", f"{hhp:.1f} HP")


def mse_analysis():
    """Mechanical Specific Energy analysis"""

    st.subheader("Mechanical Specific Energy (MSE) Analysis")

    st.markdown("""
    **MSE** detects drilling inefficiencies:
    - Bit wear
    - Poor hole cleaning
    - Vibration
    - Incorrect parameters
    """)

    col1, col2 = st.columns(2)

    with col1:
        wob = st.number_input("WOB (kN)", value=100.0, format="%.1f", key="mse_wob")
        rpm = st.number_input("RPM", value=120.0, format="%.1f", key="mse_rpm")
        torque = st.number_input("Torque (kN.m)", value=5.0, format="%.2f")
        rop = st.number_input("ROP (m/hr)", value=15.0, format="%.1f", key="mse_rop")

    with col2:
        bit_diameter = st.number_input("Bit Diameter (mm)", value=215.9, format="%.1f", key="mse_bit")
        rock_strength = st.number_input("Rock Strength (MPa)", value=50.0, format="%.1f")

    if st.button("⚡ Calculate MSE", type="primary"):
        if rop > 0:
            mse = rop_models.calculate_mechanical_specific_energy(
                wob, rpm, torque, rop, bit_diameter
            )

            inefficiency = rop_models.detect_drilling_inefficiency(mse, rock_strength)

            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("MSE", f"{mse:.1f} MPa")

            with col2:
                st.metric("Rock Strength", f"{rock_strength:.1f} MPa")

            with col3:
                st.metric("Efficiency", f"{inefficiency['efficiency']*100:.1f}%")

            # Status
            status_icon = {
                'efficient': '🟢',
                'moderate': '🟡',
                'inefficient': '🔴'
            }.get(inefficiency['status'], '⚪')

            st.markdown(f"### {status_icon} Status: **{inefficiency['status'].upper()}**")
            st.info(f"**Recommendation:** {inefficiency['recommendation']}")

        else:
            st.error("ROP must be greater than 0")


def cost_optimization():
    """Drilling cost optimization"""

    st.subheader("Drilling Cost Optimization")

    col1, col2 = st.columns(2)

    with col1:
        rig_cost = st.number_input("Rig Cost ($/day)", value=50000.0, format="%.0f")
        bit_cost = st.number_input("Bit Cost ($)", value=30000.0, format="%.0f")
        trip_time = st.number_input("Trip Time (hours)", value=8.0, format="%.1f")

    with col2:
        rop_initial = st.number_input("Initial ROP (m/hr)", value=20.0, format="%.1f", key="cost_rop")
        rop_decay = st.number_input("ROP Decay (%/100m)", value=5.0, format="%.1f")

    if st.button("💰 Optimize Bit Run", type="primary"):
        with st.spinner("Optimizing..."):
            optimization = rop_models.optimize_bit_run_length(
                rig_cost, rop_initial, rop_decay / 100, bit_cost, trip_time
            )

            st.success("✅ Optimization Complete!")

            col1, col2 = st.columns(2)

            with col1:
                st.metric("Optimal Bit Run", f"{optimization['optimal_bit_run']:.0f} m")

            with col2:
                st.metric("Minimum Cost/Meter", f"${optimization['minimum_cost_per_meter']:.2f}/m")

            # Plot cost vs distance
            fig = go.Figure()

            fig.add_trace(go.Scatter(
                x=optimization['distances'],
                y=optimization['costs'],
                mode='lines+markers',
                name='Cost per Meter',
                line=dict(color='red', width=3),
                marker=dict(size=8)
            ))

            # Mark optimal point
            fig.add_trace(go.Scatter(
                x=[optimization['optimal_bit_run']],
                y=[optimization['minimum_cost_per_meter']],
                mode='markers',
                name='Optimal Point',
                marker=dict(size=15, color='green', symbol='star')
            ))

            fig.update_layout(
                title='Cost Optimization Curve',
                xaxis_title='Bit Run Length (m)',
                yaxis_title='Cost per Meter ($/m)',
                height=500
            )

            st.plotly_chart(fig, use_container_width=True)
