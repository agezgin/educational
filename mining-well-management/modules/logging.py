"""
Well Logging Module
Manage LAS files, well logs, formation tops using lasio and welly
"""

import streamlit as st
import pandas as pd
from datetime import datetime
from database.models import Well, WellLog, get_session
import os

try:
    import lasio
    LASIO_AVAILABLE = True
except ImportError:
    LASIO_AVAILABLE = False
    st.warning("lasio package not installed. Install with: pip install lasio")

try:
    import welly
    WELLY_AVAILABLE = True
except ImportError:
    WELLY_AVAILABLE = False


def show():
    """Main well logging interface"""

    st.header("📊 Well Logging")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📋 Log Registry", "📤 Upload LAS", "📈 Log Visualization", "🎯 Formation Tops"])

    with tabs[0]:
        show_log_registry()

    with tabs[1]:
        upload_las_file()

    with tabs[2]:
        visualize_logs()

    with tabs[3]:
        manage_formation_tops()


def show_log_registry():
    """Display well log registry"""

    st.subheader("Well Log Registry")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        logs = session.query(WellLog).filter_by(well_id=well.id).order_by(WellLog.log_name).all()

        if logs:
            log_data = []
            for log in logs:
                log_data.append({
                    'Log Name': log.log_name,
                    'Type': log.log_type or 'N/A',
                    'Depth Start (m)': f"{log.measured_depth_start:.2f}" if log.measured_depth_start else 'N/A',
                    'Depth End (m)': f"{log.measured_depth_end:.2f}" if log.measured_depth_end else 'N/A',
                    'Run Date': log.run_date.strftime('%Y-%m-%d') if log.run_date else 'N/A',
                    'Company': log.logging_company or 'N/A',
                    'File': log.file_path or 'N/A'
                })

            df = pd.DataFrame(log_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

        else:
            st.info("No well logs registered. Upload LAS files using 'Upload LAS' tab.")

    finally:
        session.close()


def upload_las_file():
    """Upload and parse LAS files"""

    st.subheader("Upload LAS File")

    if not LASIO_AVAILABLE:
        st.error("lasio package not available. Install with: pip install lasio")
        return

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Uploading for: **{well.well_name}**")

        uploaded_file = st.file_uploader("Choose LAS file", type=['las'])

        if uploaded_file:
            try:
                # Parse LAS file
                las = lasio.read(uploaded_file)

                st.success(f"✅ LAS file parsed successfully: {las.well.WELL.value if hasattr(las.well, 'WELL') else 'Unknown'}")

                # Display header info
                with st.expander("📋 LAS File Information"):
                    col1, col2 = st.columns(2)

                    with col1:
                        st.write("**Well Information:**")
                        for item in las.well:
                            st.caption(f"{item.mnemonic}: {item.value} {item.unit}")

                    with col2:
                        st.write("**Curves:**")
                        for curve in las.curves:
                            st.caption(f"{curve.mnemonic} ({curve.unit}): {curve.descr}")

                # Display data preview
                st.write("**Data Preview:**")
                df = las.df()
                st.dataframe(df.head(20), use_container_width=True)

                st.write(f"**Depth Range:** {df.index.min():.2f} - {df.index.max():.2f} m")
                st.write(f"**Number of curves:** {len(las.curves)}")

                # Save options
                with st.form("save_las_form"):
                    log_name = st.text_input("Log Name *", value=uploaded_file.name.replace('.las', ''))
                    log_type = st.selectbox("Log Type", ["Composite", "Gamma Ray", "Resistivity", "Neutron", "Density", "Sonic", "Other"])
                    logging_company = st.text_input("Logging Company")
                    run_date = st.date_input("Run Date", value=datetime.now())
                    notes = st.text_area("Notes")

                    # Save file option
                    save_file = st.checkbox("Save LAS file to server", value=True)

                    submitted = st.form_submit_button("💾 Save Log Entry")

                    if submitted:
                        try:
                            file_path = None

                            if save_file:
                                # Create data directory
                                data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'las_files')
                                os.makedirs(data_dir, exist_ok=True)

                                # Save file
                                file_path = os.path.join(data_dir, f"{well.well_name}_{log_name}.las")
                                las.write(file_path)

                            # Save to database
                            new_log = WellLog(
                                well_id=well.id,
                                log_name=log_name,
                                log_type=log_type,
                                measured_depth_start=float(df.index.min()),
                                measured_depth_end=float(df.index.max()),
                                file_path=file_path,
                                run_date=datetime.combine(run_date, datetime.min.time()),
                                logging_company=logging_company if logging_company else None,
                                notes=notes if notes else None
                            )

                            session.add(new_log)
                            session.commit()

                            st.success(f"✅ Log '{log_name}' saved successfully!")

                        except Exception as e:
                            session.rollback()
                            st.error(f"Error saving log: {str(e)}")

            except Exception as e:
                st.error(f"Error parsing LAS file: {str(e)}")

    finally:
        session.close()


def visualize_logs():
    """Visualize well logs"""

    st.subheader("Log Visualization")

    if not LASIO_AVAILABLE:
        st.error("lasio package not available")
        return

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        logs = session.query(WellLog).filter_by(well_id=well.id).filter(
            WellLog.file_path.isnot(None)
        ).all()

        if not logs:
            st.info("No LAS files with saved paths available for visualization")
            return

        log_names = [log.log_name for log in logs]
        selected_log = st.selectbox("Select Log to Visualize:", log_names)

        if selected_log:
            log = next(l for l in logs if l.log_name == selected_log)

            if log.file_path and os.path.exists(log.file_path):
                try:
                    las = lasio.read(log.file_path)
                    df = las.df()

                    # Select curves to plot
                    available_curves = list(df.columns)
                    selected_curves = st.multiselect("Select curves to plot:", available_curves, default=available_curves[:min(3, len(available_curves))])

                    if selected_curves:
                        import plotly.graph_objects as go
                        from plotly.subplots import make_subplots

                        # Create subplots
                        fig = make_subplots(
                            rows=1,
                            cols=len(selected_curves),
                            subplot_titles=selected_curves,
                            shared_yaxes=True
                        )

                        for idx, curve in enumerate(selected_curves, 1):
                            fig.add_trace(
                                go.Scatter(
                                    x=df[curve],
                                    y=df.index,
                                    mode='lines',
                                    name=curve,
                                    line=dict(width=1)
                                ),
                                row=1,
                                col=idx
                            )

                            fig.update_xaxes(title_text=curve, row=1, col=idx)

                        fig.update_yaxes(title_text="Depth (m)", autorange='reversed', row=1, col=1)

                        fig.update_layout(
                            title=f"Well Log - {well.well_name}",
                            height=800,
                            showlegend=False
                        )

                        st.plotly_chart(fig, use_container_width=True)

                    else:
                        st.warning("Please select at least one curve to plot")

                except Exception as e:
                    st.error(f"Error visualizing log: {str(e)}")
            else:
                st.error("LAS file not found on server")

    finally:
        session.close()


def manage_formation_tops():
    """Manage formation tops/picks"""

    st.subheader("Formation Tops Management")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        # Display existing tops
        tops = session.query(WellLog).filter_by(well_id=well.id).filter(
            WellLog.formation_name.isnot(None)
        ).order_by(WellLog.top_depth).all()

        if tops:
            tops_data = []
            for top in tops:
                tops_data.append({
                    'Formation': top.formation_name,
                    'Top Depth (m)': f"{top.top_depth:.2f}" if top.top_depth else 'N/A'
                })

            df = pd.DataFrame(tops_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

        else:
            st.info("No formation tops recorded")

        # Add new top
        with st.form("add_formation_top"):
            st.markdown("**Add Formation Top**")

            col1, col2 = st.columns(2)

            with col1:
                formation_name = st.text_input("Formation Name *", placeholder="e.g., Sandstone A")

            with col2:
                top_depth = st.number_input("Top Depth (m) *", min_value=0.0, value=0.0, format="%.2f")

            notes = st.text_area("Notes")

            submitted = st.form_submit_button("➕ Add Formation Top")

            if submitted:
                if not formation_name or top_depth == 0:
                    st.error("Formation name and depth are required")
                    return

                try:
                    new_top = WellLog(
                        well_id=well.id,
                        log_name=f"Top_{formation_name}",
                        log_type="Formation Top",
                        formation_name=formation_name,
                        top_depth=top_depth,
                        notes=notes if notes else None
                    )

                    session.add(new_top)
                    session.commit()

                    st.success(f"✅ Formation top '{formation_name}' added at {top_depth}m")
                    st.rerun()

                except Exception as e:
                    session.rollback()
                    st.error(f"Error adding formation top: {str(e)}")

    finally:
        session.close()
