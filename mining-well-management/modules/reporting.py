"""
Reporting Module
Generate reports, dashboards, and export data
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, timedelta
from database.models import Well, Survey, DrillingRecord, ProductionRecord, Completion, get_session


def show():
    """Main reporting interface"""

    st.header("📑 Reporting & Analytics")

    tabs = st.tabs(["📊 Executive Dashboard", "📈 Drilling Performance", "📋 Well Report", "📥 Export Data"])

    with tabs[0]:
        executive_dashboard()

    with tabs[1]:
        drilling_performance()

    with tabs[2]:
        well_report()

    with tabs[3]:
        export_data()


def executive_dashboard():
    """Executive level dashboard"""

    st.subheader("Executive Dashboard")

    session = get_session(st.session_state.db_engine)

    try:
        # Overall statistics
        total_wells = session.query(Well).count()
        producing_wells = session.query(Well).filter_by(well_status='Producing').count()
        drilling_wells = session.query(Well).filter_by(well_status='Drilling').count()
        completed_wells = session.query(Well).filter_by(well_status='Completed').count()

        col1, col2, col3, col4 = st.columns(4)

        with col1:
            st.metric("Total Wells", total_wells)

        with col2:
            st.metric("Producing", producing_wells, delta=f"{(producing_wells/total_wells*100):.1f}%" if total_wells > 0 else "0%")

        with col3:
            st.metric("Drilling", drilling_wells)

        with col4:
            st.metric("Completed", completed_wells)

        st.markdown("---")

        # Charts
        col_left, col_right = st.columns(2)

        with col_left:
            st.subheader("Wells by Status")

            wells = session.query(Well).all()

            if wells:
                status_counts = {}
                for w in wells:
                    status = w.well_status or 'Unknown'
                    status_counts[status] = status_counts.get(status, 0) + 1

                fig = px.bar(
                    x=list(status_counts.keys()),
                    y=list(status_counts.values()),
                    labels={'x': 'Status', 'y': 'Count'},
                    title='Well Status Distribution'
                )

                st.plotly_chart(fig, use_container_width=True)

        with col_right:
            st.subheader("Wells by Type")

            if wells:
                type_counts = {}
                for w in wells:
                    wtype = w.well_type or 'Unknown'
                    type_counts[wtype] = type_counts.get(wtype, 0) + 1

                fig = px.pie(
                    values=list(type_counts.values()),
                    names=list(type_counts.keys()),
                    title='Well Type Distribution'
                )

                st.plotly_chart(fig, use_container_width=True)

        st.markdown("---")

        # Drilling activity timeline
        st.subheader("Drilling Activity Timeline")

        drilling_records = session.query(DrillingRecord).order_by(DrillingRecord.date).limit(100).all()

        if drilling_records:
            dates = [r.date for r in drilling_records]
            depths = [r.depth_out if r.depth_out else r.depth_in for r in drilling_records]

            fig = px.scatter(
                x=dates,
                y=depths,
                title='Drilling Progress Over Time',
                labels={'x': 'Date', 'y': 'Depth (m)'}
            )

            fig.update_layout(yaxis=dict(autorange='reversed'))

            st.plotly_chart(fig, use_container_width=True)

    finally:
        session.close()


def drilling_performance():
    """Drilling performance analysis"""

    st.subheader("Drilling Performance Analysis")

    session = get_session(st.session_state.db_engine)

    try:
        wells = session.query(Well).all()

        if not wells:
            st.info("No wells available")
            return

        well_names = [w.well_name for w in wells]
        selected_wells = st.multiselect("Select Wells for Comparison:", well_names, default=well_names[:min(3, len(well_names))])

        if selected_wells:
            # Get drilling records for selected wells
            well_ids = [w.id for w in wells if w.well_name in selected_wells]

            all_records = []
            for well_id in well_ids:
                well = session.query(Well).filter_by(id=well_id).first()
                records = session.query(DrillingRecord).filter_by(well_id=well_id).filter(
                    DrillingRecord.rop.isnot(None)
                ).order_by(DrillingRecord.date).all()

                for r in records:
                    all_records.append({
                        'Well': well.well_name,
                        'Date': r.date,
                        'Depth': (r.depth_in + r.depth_out) / 2 if r.depth_in and r.depth_out else r.depth_out,
                        'ROP': r.rop,
                        'Hours': r.hours_drilling if r.hours_drilling else 0,
                        'NPT': r.hours_non_productive if r.hours_non_productive else 0
                    })

            if all_records:
                df = pd.DataFrame(all_records)

                # ROP comparison
                st.markdown("**ROP Comparison**")

                fig = px.line(
                    df,
                    x='Depth',
                    y='ROP',
                    color='Well',
                    title='ROP vs Depth Comparison'
                )

                fig.update_layout(yaxis_title="ROP (m/hr)", xaxis_title="Depth (m)")

                st.plotly_chart(fig, use_container_width=True)

                # NPT analysis
                st.markdown("**Non-Productive Time (NPT) Analysis**")

                npt_by_well = df.groupby('Well')['NPT'].sum().reset_index()

                fig2 = px.bar(
                    npt_by_well,
                    x='Well',
                    y='NPT',
                    title='Total NPT by Well'
                )

                fig2.update_layout(yaxis_title="NPT (hours)")

                st.plotly_chart(fig2, use_container_width=True)

                # Performance metrics
                st.markdown("**Performance Metrics**")

                metrics_data = []
                for well_name in selected_wells:
                    well_df = df[df['Well'] == well_name]

                    metrics_data.append({
                        'Well': well_name,
                        'Avg ROP (m/hr)': f"{well_df['ROP'].mean():.2f}",
                        'Max ROP (m/hr)': f"{well_df['ROP'].max():.2f}",
                        'Total Drilling Hrs': f"{well_df['Hours'].sum():.1f}",
                        'Total NPT Hrs': f"{well_df['NPT'].sum():.1f}",
                        'NPT %': f"{(well_df['NPT'].sum() / (well_df['Hours'].sum() + well_df['NPT'].sum()) * 100):.1f}%" if (well_df['Hours'].sum() + well_df['NPT'].sum()) > 0 else "0%"
                    })

                metrics_df = pd.DataFrame(metrics_data)
                st.dataframe(metrics_df, use_container_width=True, hide_index=True)

    finally:
        session.close()


def well_report():
    """Generate comprehensive well report"""

    st.subheader("Well Report Generator")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Generating report for: **{well.well_name}**")

        # Well header
        st.markdown("---")
        st.markdown(f"## Well Report: {well.well_name}")
        st.caption(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        st.markdown("---")

        # Basic information
        st.markdown("### 1. Well Information")

        col1, col2 = st.columns(2)

        with col1:
            st.write(f"**Well Name:** {well.well_name}")
            st.write(f"**Well Number:** {well.well_number or 'N/A'}")
            st.write(f"**Well Type:** {well.well_type or 'N/A'}")
            st.write(f"**Status:** {well.well_status or 'N/A'}")

        with col2:
            st.write(f"**Field:** {well.field_name or 'N/A'}")
            st.write(f"**Operator:** {well.current_operator or 'N/A'}")
            st.write(f"**Region:** {well.region or 'N/A'}")
            st.write(f"**Spud Date:** {well.spud_date.strftime('%Y-%m-%d') if well.spud_date else 'N/A'}")

        if well.latitude and well.longitude:
            st.write(f"**Location:** {well.latitude:.6f}°, {well.longitude:.6f}°")

        # Survey data
        st.markdown("### 2. Directional Survey")

        surveys = session.query(Survey).filter_by(well_id=well.id).order_by(Survey.measured_depth).all()

        if surveys:
            st.write(f"Total survey points: {len(surveys)}")
            st.write(f"Final MD: {surveys[-1].measured_depth:.2f} m")

            if surveys[-1].tvd:
                st.write(f"Final TVD: {surveys[-1].tvd:.2f} m")

            survey_data = []
            for s in surveys:
                survey_data.append({
                    'MD': s.measured_depth,
                    'Inc': s.inclination,
                    'Azi': s.azimuth,
                    'TVD': s.tvd if s.tvd else 0
                })

            st.dataframe(pd.DataFrame(survey_data), use_container_width=True, hide_index=True)

        # Drilling summary
        st.markdown("### 3. Drilling Summary")

        drilling_records = session.query(DrillingRecord).filter_by(well_id=well.id).all()

        if drilling_records:
            total_days = len(drilling_records)
            total_drilling_hrs = sum(r.hours_drilling for r in drilling_records if r.hours_drilling) or 0
            total_npt = sum(r.hours_non_productive for r in drilling_records if r.hours_non_productive) or 0

            col1, col2, col3 = st.columns(3)

            with col1:
                st.metric("Total Days", total_days)

            with col2:
                st.metric("Drilling Hours", f"{total_drilling_hrs:.1f}")

            with col3:
                st.metric("NPT Hours", f"{total_npt:.1f}")

        # Completion data
        st.markdown("### 4. Completion")

        completions = session.query(Completion).filter_by(well_id=well.id).order_by(Completion.completion_date.desc()).limit(1).all()

        if completions:
            comp = completions[0]

            col1, col2 = st.columns(2)

            with col1:
                st.write(f"**Completion Type:** {comp.completion_type or 'N/A'}")
                st.write(f"**Casing:** {comp.casing_size}\" {comp.casing_grade} @ {comp.casing_depth}m" if comp.casing_size and comp.casing_depth else "N/A")
                st.write(f"**Tubing:** {comp.tubing_size}\" @ {comp.tubing_depth}m" if comp.tubing_size and comp.tubing_depth else "N/A")

            with col2:
                st.write(f"**Perforation:** {comp.perf_top}m - {comp.perf_bottom}m" if comp.perf_top and comp.perf_bottom else "N/A")
                st.write(f"**Cement Volume:** {comp.cement_volume}m³" if comp.cement_volume else "N/A")

        st.markdown("---")

    finally:
        session.close()


def export_data():
    """Export data to various formats"""

    st.subheader("Export Data")

    session = get_session(st.session_state.db_engine)

    try:
        export_type = st.selectbox(
            "Select Data to Export:",
            ["All Wells", "Well Registry", "Survey Data", "Drilling Records", "Completion Data"]
        )

        if export_type == "All Wells" or export_type == "Well Registry":
            wells = session.query(Well).all()

            if wells:
                well_data = []
                for w in wells:
                    well_data.append({
                        'Well Name': w.well_name,
                        'Well Number': w.well_number or '',
                        'Type': w.well_type or '',
                        'Status': w.well_status or '',
                        'Field': w.field_name or '',
                        'Operator': w.current_operator or '',
                        'Latitude': w.latitude if w.latitude else '',
                        'Longitude': w.longitude if w.longitude else '',
                        'Spud Date': w.spud_date.strftime('%Y-%m-%d') if w.spud_date else ''
                    })

                df = pd.DataFrame(well_data)

                st.write("Preview:")
                st.dataframe(df, use_container_width=True, hide_index=True)

                # Export options
                col1, col2 = st.columns(2)

                with col1:
                    csv = df.to_csv(index=False).encode('utf-8')
                    st.download_button(
                        label="📥 Download CSV",
                        data=csv,
                        file_name=f"wells_export_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )

                with col2:
                    # Excel export
                    from io import BytesIO
                    buffer = BytesIO()
                    with pd.ExcelWriter(buffer, engine='xlsxwriter') as writer:
                        df.to_excel(writer, sheet_name='Wells', index=False)

                    st.download_button(
                        label="📥 Download Excel",
                        data=buffer.getvalue(),
                        file_name=f"wells_export_{datetime.now().strftime('%Y%m%d')}.xlsx",
                        mime="application/vnd.ms-excel"
                    )

        elif export_type == "Survey Data":
            if st.session_state.selected_well_id:
                surveys = session.query(Survey).filter_by(well_id=st.session_state.selected_well_id).order_by(Survey.measured_depth).all()

                if surveys:
                    survey_data = []
                    for s in surveys:
                        survey_data.append({
                            'MD': s.measured_depth,
                            'Inc': s.inclination,
                            'Azi': s.azimuth,
                            'TVD': s.tvd if s.tvd else 0,
                            'Northing': s.northing if s.northing else 0,
                            'Easting': s.easting if s.easting else 0
                        })

                    df = pd.DataFrame(survey_data)

                    st.dataframe(df, use_container_width=True, hide_index=True)

                    csv = df.to_csv(index=False).encode('utf-8')
                    st.download_button(
                        label="📥 Download Survey CSV",
                        data=csv,
                        file_name=f"survey_export_{datetime.now().strftime('%Y%m%d')}.csv",
                        mime="text/csv"
                    )
            else:
                st.warning("Please select a well first")

    finally:
        session.close()
