"""
Drilling Operations Module
Daily drilling records, ROP tracking, mud properties, hydraulics
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, date, timedelta
from database.models import Well, DrillingRecord, get_session


def show():
    """Main drilling operations interface"""

    st.header("⚙️ Drilling Operations")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📋 Daily Reports", "➕ Add Report", "📊 ROP Analysis", "🧪 Mud Properties", "🔧 Hydraulics"])

    with tabs[0]:
        show_drilling_records()

    with tabs[1]:
        add_drilling_record()

    with tabs[2]:
        rop_analysis()

    with tabs[3]:
        mud_properties()

    with tabs[4]:
        hydraulics_calculations()


def show_drilling_records():
    """Display drilling records"""

    st.subheader("Daily Drilling Reports")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        records = session.query(DrillingRecord).filter_by(well_id=well.id).order_by(DrillingRecord.date.desc()).all()

        if records:
            drill_data = []
            for r in records:
                drill_data.append({
                    'Date': r.date.strftime('%Y-%m-%d') if r.date else 'N/A',
                    'Depth In (m)': f"{r.depth_in:.2f}" if r.depth_in else 'N/A',
                    'Depth Out (m)': f"{r.depth_out:.2f}" if r.depth_out else 'N/A',
                    'ROP (m/hr)': f"{r.rop:.2f}" if r.rop else 'N/A',
                    'WOB (kN)': f"{r.wob:.1f}" if r.wob else 'N/A',
                    'RPM': f"{r.rpm:.0f}" if r.rpm else 'N/A',
                    'Flow (l/min)': f"{r.flow_rate:.0f}" if r.flow_rate else 'N/A',
                    'Mud Wt (kg/l)': f"{r.mud_weight:.2f}" if r.mud_weight else 'N/A',
                    'Operation': r.operation_type or 'N/A',
                    'Drilling Hrs': f"{r.hours_drilling:.1f}" if r.hours_drilling else 'N/A',
                    'NPT Hrs': f"{r.hours_non_productive:.1f}" if r.hours_non_productive else 'N/A'
                })

            df = pd.DataFrame(drill_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Statistics
            col1, col2, col3, col4 = st.columns(4)

            with col1:
                total_days = len(records)
                st.metric("Total Days", total_days)

            with col2:
                if records[0].depth_out:
                    current_depth = records[0].depth_out
                    st.metric("Current Depth (m)", f"{current_depth:.1f}")

            with col3:
                avg_rop = sum(r.rop for r in records if r.rop) / len([r for r in records if r.rop]) if any(r.rop for r in records) else 0
                st.metric("Avg ROP (m/hr)", f"{avg_rop:.2f}")

            with col4:
                total_npt = sum(r.hours_non_productive for r in records if r.hours_non_productive) or 0
                st.metric("Total NPT (hrs)", f"{total_npt:.1f}")

            # Export
            csv = df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download as CSV",
                data=csv,
                file_name=f"{well.well_name}_drilling_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )

        else:
            st.info("No drilling records available. Add records using 'Add Report' tab.")

    finally:
        session.close()


def add_drilling_record():
    """Add daily drilling report"""

    st.subheader("Add Daily Drilling Report")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Adding report for: **{well.well_name}**")

        with st.form("add_drilling_record"):
            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**Date & Depth**")
                report_date = st.date_input("Report Date *", value=datetime.now())
                depth_in = st.number_input("Depth In (m) *", min_value=0.0, value=0.0, format="%.2f")
                depth_out = st.number_input("Depth Out (m) *", min_value=0.0, value=0.0, format="%.2f")

                st.markdown("**Drilling Parameters**")
                rop = st.number_input("ROP (m/hr)", min_value=0.0, value=0.0, format="%.2f")
                rpm = st.number_input("RPM", min_value=0.0, value=0.0, format="%.1f")
                wob = st.number_input("WOB (kN)", min_value=0.0, value=0.0, format="%.1f")

            with col2:
                st.markdown("**Hydraulics**")
                torque = st.number_input("Torque (kN.m)", min_value=0.0, value=0.0, format="%.2f")
                flow_rate = st.number_input("Flow Rate (l/min)", min_value=0.0, value=0.0, format="%.1f")
                spp = st.number_input("SPP (bar)", min_value=0.0, value=0.0, format="%.1f")

                st.markdown("**Mud Properties**")
                mud_weight = st.number_input("Mud Weight (kg/l)", min_value=0.0, value=1.0, format="%.2f")
                mud_viscosity = st.number_input("Viscosity (cP)", min_value=0.0, value=0.0, format="%.1f")
                mud_temp = st.number_input("Mud Temp (°C)", min_value=0.0, value=20.0, format="%.1f")

            with col3:
                st.markdown("**Operations**")
                operation_type = st.selectbox(
                    "Operation Type",
                    ["Drilling", "Tripping In", "Tripping Out", "Circulating", "Reaming", "POOH", "RIH", "Other"]
                )
                hours_drilling = st.number_input("Drilling Hours", min_value=0.0, max_value=24.0, value=0.0, format="%.1f")
                hours_npt = st.number_input("NPT Hours", min_value=0.0, max_value=24.0, value=0.0, format="%.1f")

                st.markdown("**Bit Information**")
                bit_type = st.text_input("Bit Type", placeholder="e.g., PDC, Tricone")
                bit_size = st.number_input("Bit Size (inches)", min_value=0.0, value=8.5, format="%.2f")

                st.markdown("**Comments**")
                comments = st.text_area("Comments", placeholder="Any additional notes...")

            submitted = st.form_submit_button("✅ Add Drilling Report", use_container_width=True)

            if submitted:
                try:
                    new_record = DrillingRecord(
                        well_id=well.id,
                        date=datetime.combine(report_date, datetime.min.time()),
                        depth_in=depth_in if depth_in > 0 else None,
                        depth_out=depth_out if depth_out > 0 else None,
                        rop=rop if rop > 0 else None,
                        rpm=rpm if rpm > 0 else None,
                        wob=wob if wob > 0 else None,
                        torque=torque if torque > 0 else None,
                        flow_rate=flow_rate if flow_rate > 0 else None,
                        spp=spp if spp > 0 else None,
                        mud_weight=mud_weight if mud_weight > 0 else None,
                        mud_viscosity=mud_viscosity if mud_viscosity > 0 else None,
                        mud_temperature=mud_temp if mud_temp > 0 else None,
                        operation_type=operation_type,
                        hours_drilling=hours_drilling if hours_drilling > 0 else None,
                        hours_non_productive=hours_npt if hours_npt > 0 else None,
                        bit_type=bit_type if bit_type else None,
                        bit_size=bit_size if bit_size > 0 else None,
                        comments=comments if comments else None
                    )

                    session.add(new_record)
                    session.commit()

                    st.success(f"✅ Drilling report added for {report_date}")

                except Exception as e:
                    session.rollback()
                    st.error(f"Error adding report: {str(e)}")

    finally:
        session.close()


def rop_analysis():
    """ROP analysis and visualization"""

    st.subheader("Rate of Penetration (ROP) Analysis")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        records = session.query(DrillingRecord).filter_by(well_id=well.id).filter(
            DrillingRecord.rop.isnot(None)
        ).order_by(DrillingRecord.date).all()

        if not records or len(records) < 2:
            st.info("Need at least 2 drilling records with ROP data")
            return

        # ROP vs Depth
        depths = [(r.depth_in + r.depth_out) / 2 if r.depth_in and r.depth_out else r.depth_out for r in records]
        rops = [r.rop for r in records]
        dates = [r.date for r in records]

        fig1 = go.Figure()
        fig1.add_trace(go.Scatter(
            x=rops,
            y=depths,
            mode='lines+markers',
            name='ROP',
            marker=dict(size=8, color=rops, colorscale='Viridis', showscale=True),
            line=dict(width=2)
        ))

        fig1.update_layout(
            title="ROP vs Depth",
            xaxis_title="ROP (m/hr)",
            yaxis_title="Depth (m)",
            yaxis=dict(autorange='reversed'),
            height=500
        )

        st.plotly_chart(fig1, use_container_width=True)

        # ROP vs Time
        fig2 = px.line(
            x=dates,
            y=rops,
            markers=True,
            title="ROP vs Time"
        )

        fig2.update_layout(
            xaxis_title="Date",
            yaxis_title="ROP (m/hr)",
            height=400
        )

        st.plotly_chart(fig2, use_container_width=True)

        # Statistics
        col1, col2, col3, col4 = st.columns(4)

        with col1:
            avg_rop = sum(rops) / len(rops)
            st.metric("Average ROP", f"{avg_rop:.2f} m/hr")

        with col2:
            max_rop = max(rops)
            st.metric("Max ROP", f"{max_rop:.2f} m/hr")

        with col3:
            min_rop = min(rops)
            st.metric("Min ROP", f"{min_rop:.2f} m/hr")

        with col4:
            import numpy as np
            std_rop = np.std(rops)
            st.metric("Std Dev", f"{std_rop:.2f} m/hr")

    finally:
        session.close()


def mud_properties():
    """Mud properties tracking"""

    st.subheader("Mud Properties Tracking")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        records = session.query(DrillingRecord).filter_by(well_id=well.id).filter(
            DrillingRecord.mud_weight.isnot(None)
        ).order_by(DrillingRecord.date).all()

        if not records:
            st.info("No mud property data available")
            return

        dates = [r.date for r in records]
        mud_weights = [r.mud_weight for r in records]
        viscosities = [r.mud_viscosity if r.mud_viscosity else 0 for r in records]

        # Mud weight over time
        fig1 = px.line(
            x=dates,
            y=mud_weights,
            markers=True,
            title="Mud Weight Over Time"
        )

        fig1.update_layout(
            xaxis_title="Date",
            yaxis_title="Mud Weight (kg/l)",
            height=400
        )

        st.plotly_chart(fig1, use_container_width=True)

        # Viscosity over time
        if any(v > 0 for v in viscosities):
            fig2 = px.line(
                x=dates,
                y=viscosities,
                markers=True,
                title="Mud Viscosity Over Time"
            )

            fig2.update_layout(
                xaxis_title="Date",
                yaxis_title="Viscosity (cP)",
                height=400
            )

            st.plotly_chart(fig2, use_container_width=True)

    finally:
        session.close()


def hydraulics_calculations():
    """Drilling hydraulics calculations"""

    st.subheader("Drilling Hydraulics")

    st.info("Hydraulics calculations - Advanced drilling hydraulics using industry models")

    st.markdown("""
    **Available Calculations:**
    - Annular Pressure Loss
    - Drill String Pressure Loss
    - Equivalent Circulating Density (ECD)
    - Hydraulic Horsepower (HHP)
    - Jet Velocity & Impact Force
    - Critical Flow Rate

    **Note:** Advanced hydraulics calculations require additional parameters and models.
    Consider integrating APMonitor or custom hydraulics models.
    """)

    # Simple ECD calculator
    st.markdown("### Quick ECD Calculator")

    col1, col2 = st.columns(2)

    with col1:
        mud_weight = st.number_input("Mud Weight (kg/l)", value=1.2, format="%.2f")
        tvd = st.number_input("TVD (m)", value=1000.0, format="%.1f")
        pressure_loss = st.number_input("Annular Pressure Loss (bar)", value=10.0, format="%.1f")

    with col2:
        if st.button("Calculate ECD"):
            # ECD = MW + (Pressure Loss / TVD)
            # Convert bar to kg/l equivalent
            pressure_gradient = pressure_loss / tvd if tvd > 0 else 0
            ecd = mud_weight + (pressure_gradient * 10.2)  # Simplified conversion

            st.success(f"**ECD = {ecd:.2f} kg/l**")

            st.caption("Note: This is a simplified calculation. Use professional software for accurate results.")
