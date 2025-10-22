"""
Completion Module
Casing, tubing, cementing, perforation management
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
from datetime import datetime
from database.models import Well, Completion, get_session


def show():
    """Main completion interface"""

    st.header("🔧 Well Completion")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📋 Completion Summary", "➕ Add Completion", "📐 Casing Design", "🎯 Perforation"])

    with tabs[0]:
        show_completion_summary()

    with tabs[1]:
        add_completion()

    with tabs[2]:
        casing_design()

    with tabs[3]:
        perforation_design()


def show_completion_summary():
    """Display completion summary"""

    st.subheader("Completion Summary")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        completions = session.query(Completion).filter_by(well_id=well.id).order_by(Completion.completion_date.desc()).all()

        if completions:
            comp_data = []
            for comp in completions:
                comp_data.append({
                    'Type': comp.completion_type or 'N/A',
                    'Date': comp.completion_date.strftime('%Y-%m-%d') if comp.completion_date else 'N/A',
                    'Casing Size (in)': f"{comp.casing_size:.2f}" if comp.casing_size else 'N/A',
                    'Casing Grade': comp.casing_grade or 'N/A',
                    'Casing Depth (m)': f"{comp.casing_depth:.2f}" if comp.casing_depth else 'N/A',
                    'Tubing Size (in)': f"{comp.tubing_size:.2f}" if comp.tubing_size else 'N/A',
                    'Tubing Depth (m)': f"{comp.tubing_depth:.2f}" if comp.tubing_depth else 'N/A',
                    'Perf Top (m)': f"{comp.perf_top:.2f}" if comp.perf_top else 'N/A',
                    'Perf Bottom (m)': f"{comp.perf_bottom:.2f}" if comp.perf_bottom else 'N/A'
                })

            df = pd.DataFrame(comp_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Completion schematic
            latest_comp = completions[0]

            if latest_comp.casing_depth or latest_comp.tubing_depth:
                st.subheader("Completion Schematic")

                fig = go.Figure()

                # Casing
                if latest_comp.casing_depth and latest_comp.casing_size:
                    casing_radius = latest_comp.casing_size / 2 * 25.4  # Convert inches to mm
                    fig.add_trace(go.Scatter(
                        x=[-casing_radius, -casing_radius, casing_radius, casing_radius, -casing_radius],
                        y=[0, -latest_comp.casing_depth, -latest_comp.casing_depth, 0, 0],
                        mode='lines',
                        name=f'Casing {latest_comp.casing_size}"',
                        line=dict(color='gray', width=4)
                    ))

                # Tubing
                if latest_comp.tubing_depth and latest_comp.tubing_size:
                    tubing_radius = latest_comp.tubing_size / 2 * 25.4
                    fig.add_trace(go.Scatter(
                        x=[-tubing_radius, -tubing_radius, tubing_radius, tubing_radius, -tubing_radius],
                        y=[0, -latest_comp.tubing_depth, -latest_comp.tubing_depth, 0, 0],
                        mode='lines',
                        name=f'Tubing {latest_comp.tubing_size}"',
                        line=dict(color='blue', width=3)
                    ))

                # Perforation interval
                if latest_comp.perf_top and latest_comp.perf_bottom:
                    perf_radius = (latest_comp.casing_size / 2 * 25.4) * 1.1
                    fig.add_trace(go.Scatter(
                        x=[-perf_radius, perf_radius],
                        y=[-latest_comp.perf_top, -latest_comp.perf_top],
                        mode='lines',
                        name='Perf Top',
                        line=dict(color='red', width=2, dash='dash')
                    ))
                    fig.add_trace(go.Scatter(
                        x=[-perf_radius, perf_radius],
                        y=[-latest_comp.perf_bottom, -latest_comp.perf_bottom],
                        mode='lines',
                        name='Perf Bottom',
                        line=dict(color='red', width=2, dash='dash')
                    ))

                fig.update_layout(
                    title=f"Completion Schematic - {well.well_name}",
                    xaxis_title="Radius (mm)",
                    yaxis_title="Depth (m)",
                    height=700,
                    showlegend=True,
                    hovermode='closest'
                )

                st.plotly_chart(fig, use_container_width=True)

        else:
            st.info("No completion data available. Add completion using 'Add Completion' tab.")

    finally:
        session.close()


def add_completion():
    """Add completion data"""

    st.subheader("Add Completion Data")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Adding completion for: **{well.well_name}**")

        with st.form("add_completion_form"):
            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**Completion Information**")
                completion_type = st.selectbox(
                    "Completion Type",
                    ["Open Hole", "Cased Hole", "Liner", "Gravel Pack", "Frac Pack", "Other"]
                )
                completion_date = st.date_input("Completion Date", value=datetime.now())

                st.markdown("**Casing**")
                casing_size = st.number_input("Casing Size (inches)", value=7.0, format="%.3f")
                casing_grade = st.selectbox("Casing Grade", ["J55", "K55", "N80", "L80", "P110", "Q125"])
                casing_weight = st.number_input("Casing Weight (kg/m)", value=0.0, format="%.2f")
                casing_depth = st.number_input("Casing Depth (m)", value=0.0, format="%.2f")

            with col2:
                st.markdown("**Tubing**")
                tubing_size = st.number_input("Tubing Size (inches)", value=2.875, format="%.3f")
                tubing_grade = st.selectbox("Tubing Grade", ["J55", "K55", "N80", "L80", "P110"])
                tubing_depth = st.number_input("Tubing Depth (m)", value=0.0, format="%.2f")

                st.markdown("**Cementing**")
                cement_top = st.number_input("Cement Top (m)", value=0.0, format="%.2f")
                cement_volume = st.number_input("Cement Volume (m³)", value=0.0, format="%.2f")
                cement_type = st.text_input("Cement Type", placeholder="e.g., Class G")

            with col3:
                st.markdown("**Perforation**")
                perf_top = st.number_input("Perforation Top (m)", value=0.0, format="%.2f")
                perf_bottom = st.number_input("Perforation Bottom (m)", value=0.0, format="%.2f")
                perf_density = st.number_input("Perf Density (shots/m)", value=0.0, format="%.1f")

                st.markdown("**Completion Fluid**")
                comp_fluid = st.text_input("Completion Fluid", placeholder="e.g., CaCl2 brine")
                fluid_density = st.number_input("Fluid Density (kg/l)", value=0.0, format="%.2f")

                st.markdown("**Comments**")
                comments = st.text_area("Comments", placeholder="Additional notes...")

            submitted = st.form_submit_button("✅ Add Completion", use_container_width=True)

            if submitted:
                try:
                    new_completion = Completion(
                        well_id=well.id,
                        completion_type=completion_type,
                        completion_date=datetime.combine(completion_date, datetime.min.time()),
                        casing_size=casing_size if casing_size > 0 else None,
                        casing_grade=casing_grade,
                        casing_weight=casing_weight if casing_weight > 0 else None,
                        casing_depth=casing_depth if casing_depth > 0 else None,
                        tubing_size=tubing_size if tubing_size > 0 else None,
                        tubing_grade=tubing_grade,
                        tubing_depth=tubing_depth if tubing_depth > 0 else None,
                        cement_top=cement_top if cement_top > 0 else None,
                        cement_volume=cement_volume if cement_volume > 0 else None,
                        cement_type=cement_type if cement_type else None,
                        perf_top=perf_top if perf_top > 0 else None,
                        perf_bottom=perf_bottom if perf_bottom > 0 else None,
                        perf_density=perf_density if perf_density > 0 else None,
                        completion_fluid=comp_fluid if comp_fluid else None,
                        completion_fluid_density=fluid_density if fluid_density > 0 else None,
                        comments=comments if comments else None
                    )

                    session.add(new_completion)
                    session.commit()

                    st.success(f"✅ Completion data added for {completion_date}")

                except Exception as e:
                    session.rollback()
                    st.error(f"Error adding completion: {str(e)}")

    finally:
        session.close()


def casing_design():
    """Casing design calculator"""

    st.subheader("Casing Design Calculator")

    st.info("Casing design calculations - Burst, Collapse, Tension")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Input Parameters**")
        casing_size = st.number_input("Casing OD (inches)", value=7.0, format="%.3f")
        casing_weight = st.number_input("Weight (kg/m)", value=26.4, format="%.2f")
        grade = st.selectbox("Grade", ["J55", "K55", "N80", "L80", "P110", "Q125"])
        depth = st.number_input("Depth (m)", value=1000.0, format="%.1f")

        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f")

    with col2:
        st.markdown("**Design Factors**")
        burst_sf = st.number_input("Burst Safety Factor", value=1.1, format="%.2f")
        collapse_sf = st.number_input("Collapse Safety Factor", value=1.0, format="%.2f")
        tension_sf = st.number_input("Tension Safety Factor", value=1.8, format="%.2f")

        if st.button("Calculate Design Loads"):
            # Simplified calculations (actual design requires API formulas)

            # Internal pressure (burst) = mud weight * depth
            internal_pressure = mud_weight * 0.0981 * depth  # bar

            # External pressure (collapse) = formation pressure
            external_pressure = 1.0 * 0.0981 * depth  # Assume normal pressure

            # Tension = buoyant weight
            buoyant_weight = casing_weight * depth * 0.87  # kN

            st.markdown("**Design Loads:**")
            st.write(f"- Burst Pressure: {internal_pressure:.1f} bar")
            st.write(f"- Collapse Pressure: {external_pressure:.1f} bar")
            st.write(f"- Tension: {buoyant_weight:.1f} kN")

            st.caption("Note: This is a simplified calculation. Use API 5C3 standards for actual design.")


def perforation_design():
    """Perforation design"""

    st.subheader("Perforation Design")

    st.markdown("**Perforation Parameters:**")

    col1, col2 = st.columns(2)

    with col1:
        interval_length = st.number_input("Interval Length (m)", value=10.0, format="%.2f")
        shots_per_meter = st.number_input("Shot Density (shots/m)", value=12.0, format="%.1f")
        phase_angle = st.number_input("Phase Angle (degrees)", value=60.0, format="%.1f")

    with col2:
        if st.button("Calculate Total Shots"):
            total_shots = interval_length * shots_per_meter

            st.success(f"**Total Shots: {int(total_shots)}**")

            # Estimate perforation tunnel penetration (simplified)
            penetration = 0.3  # meters (typical for shaped charges)

            st.info(f"Estimated Penetration: {penetration*100:.0f} cm")
            st.caption(f"Phase Angle: {phase_angle}°")
