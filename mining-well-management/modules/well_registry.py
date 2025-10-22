"""
Well Registry Module
Add, edit, view, and manage well information
"""

import streamlit as st
import pandas as pd
from datetime import datetime, date
from database.models import Well, get_session


def show():
    """Main well registry interface"""

    st.header("📝 Well Registry")

    tabs = st.tabs(["📋 Well List", "➕ Add New Well", "✏️ Edit Well", "🗑️ Delete Well"])

    with tabs[0]:
        show_well_list()

    with tabs[1]:
        add_new_well()

    with tabs[2]:
        edit_well()

    with tabs[3]:
        delete_well()


def show_well_list():
    """Display list of all wells"""

    st.subheader("All Registered Wells")

    session = get_session(st.session_state.db_engine)

    try:
        wells = session.query(Well).order_by(Well.well_name).all()

        if wells:
            well_data = []
            for w in wells:
                well_data.append({
                    'ID': w.id,
                    'Well Name': w.well_name,
                    'Well Number': w.well_number or 'N/A',
                    'Type': w.well_type or 'N/A',
                    'Status': w.well_status or 'N/A',
                    'Field': w.field_name or 'N/A',
                    'Operator': w.current_operator or 'N/A',
                    'Spud Date': w.spud_date.strftime('%Y-%m-%d') if w.spud_date else 'N/A',
                    'Latitude': f"{w.latitude:.6f}" if w.latitude else 'N/A',
                    'Longitude': f"{w.longitude:.6f}" if w.longitude else 'N/A'
                })

            df = pd.DataFrame(well_data)

            # Search filter
            search = st.text_input("🔍 Search wells:", placeholder="Enter well name, number, or field...")

            if search:
                df = df[df.apply(lambda row: row.astype(str).str.contains(search, case=False).any(), axis=1)]

            st.dataframe(df, use_container_width=True, hide_index=True)

            # Export option
            csv = df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download as CSV",
                data=csv,
                file_name=f"wells_registry_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )

        else:
            st.info("No wells registered yet. Use 'Add New Well' tab to add wells.")

    finally:
        session.close()


def add_new_well():
    """Form to add new well"""

    st.subheader("Add New Well")

    with st.form("add_well_form"):
        col1, col2 = st.columns(2)

        with col1:
            st.markdown("**Basic Information**")
            well_name = st.text_input("Well Name *", placeholder="e.g., WELL-001")
            well_number = st.text_input("Well Number", placeholder="e.g., API-12345")
            well_type = st.selectbox(
                "Well Type",
                ["Exploration", "Development", "Injection", "Observation", "Water Disposal", "Other"]
            )
            well_status = st.selectbox(
                "Well Status *",
                ["Planned", "Drilling", "Completed", "Producing", "Shut-in", "Abandoned", "P&A"]
            )

            st.markdown("**Location**")
            latitude = st.number_input("Latitude (decimal degrees)", value=0.0, format="%.6f")
            longitude = st.number_input("Longitude (decimal degrees)", value=0.0, format="%.6f")
            surface_elevation = st.number_input("Surface Elevation (meters)", value=0.0, format="%.2f")

        with col2:
            st.markdown("**Operational Information**")
            current_operator = st.text_input("Current Operator", placeholder="Company name")
            field_name = st.text_input("Field Name", placeholder="Field/Area name")
            region = st.text_input("Region", placeholder="Region/Basin")

            st.markdown("**Dates**")
            spud_date = st.date_input("Spud Date", value=None)
            completion_date = st.date_input("Completion Date", value=None)
            first_production_date = st.date_input("First Production Date", value=None)

            st.markdown("**Notes**")
            notes = st.text_area("Additional Notes", placeholder="Any additional information...")

        submitted = st.form_submit_button("✅ Add Well", use_container_width=True)

        if submitted:
            if not well_name:
                st.error("Well Name is required!")
                return

            session = get_session(st.session_state.db_engine)

            try:
                # Check if well name already exists
                existing = session.query(Well).filter_by(well_name=well_name).first()
                if existing:
                    st.error(f"Well '{well_name}' already exists!")
                    return

                # Create new well
                new_well = Well(
                    well_name=well_name,
                    well_number=well_number if well_number else None,
                    well_type=well_type,
                    well_status=well_status,
                    latitude=latitude if latitude != 0.0 else None,
                    longitude=longitude if longitude != 0.0 else None,
                    surface_elevation=surface_elevation if surface_elevation != 0.0 else None,
                    current_operator=current_operator if current_operator else None,
                    field_name=field_name if field_name else None,
                    region=region if region else None,
                    spud_date=datetime.combine(spud_date, datetime.min.time()) if spud_date else None,
                    completion_date=datetime.combine(completion_date, datetime.min.time()) if completion_date else None,
                    first_production_date=datetime.combine(first_production_date, datetime.min.time()) if first_production_date else None,
                    notes=notes if notes else None
                )

                session.add(new_well)
                session.commit()

                st.success(f"✅ Well '{well_name}' added successfully!")
                st.balloons()

            except Exception as e:
                session.rollback()
                st.error(f"Error adding well: {str(e)}")

            finally:
                session.close()


def edit_well():
    """Edit existing well"""

    st.subheader("Edit Well")

    session = get_session(st.session_state.db_engine)

    try:
        wells = session.query(Well).order_by(Well.well_name).all()

        if not wells:
            st.info("No wells available to edit.")
            return

        well_names = [w.well_name for w in wells]
        selected_well_name = st.selectbox("Select Well to Edit:", well_names)

        if selected_well_name:
            well = session.query(Well).filter_by(well_name=selected_well_name).first()

            with st.form("edit_well_form"):
                col1, col2 = st.columns(2)

                with col1:
                    st.markdown("**Basic Information**")
                    well_name = st.text_input("Well Name *", value=well.well_name)
                    well_number = st.text_input("Well Number", value=well.well_number or "")
                    well_type = st.selectbox(
                        "Well Type",
                        ["Exploration", "Development", "Injection", "Observation", "Water Disposal", "Other"],
                        index=["Exploration", "Development", "Injection", "Observation", "Water Disposal", "Other"].index(well.well_type) if well.well_type in ["Exploration", "Development", "Injection", "Observation", "Water Disposal", "Other"] else 0
                    )
                    well_status = st.selectbox(
                        "Well Status *",
                        ["Planned", "Drilling", "Completed", "Producing", "Shut-in", "Abandoned", "P&A"],
                        index=["Planned", "Drilling", "Completed", "Producing", "Shut-in", "Abandoned", "P&A"].index(well.well_status) if well.well_status in ["Planned", "Drilling", "Completed", "Producing", "Shut-in", "Abandoned", "P&A"] else 0
                    )

                    st.markdown("**Location**")
                    latitude = st.number_input("Latitude", value=float(well.latitude) if well.latitude else 0.0, format="%.6f")
                    longitude = st.number_input("Longitude", value=float(well.longitude) if well.longitude else 0.0, format="%.6f")
                    surface_elevation = st.number_input("Surface Elevation (m)", value=float(well.surface_elevation) if well.surface_elevation else 0.0, format="%.2f")

                with col2:
                    st.markdown("**Operational Information**")
                    current_operator = st.text_input("Current Operator", value=well.current_operator or "")
                    field_name = st.text_input("Field Name", value=well.field_name or "")
                    region = st.text_input("Region", value=well.region or "")

                    st.markdown("**Dates**")
                    spud_date = st.date_input("Spud Date", value=well.spud_date.date() if well.spud_date else None)
                    completion_date = st.date_input("Completion Date", value=well.completion_date.date() if well.completion_date else None)
                    first_production_date = st.date_input("First Production Date", value=well.first_production_date.date() if well.first_production_date else None)

                    st.markdown("**Notes**")
                    notes = st.text_area("Additional Notes", value=well.notes or "")

                submitted = st.form_submit_button("💾 Update Well", use_container_width=True)

                if submitted:
                    try:
                        well.well_name = well_name
                        well.well_number = well_number if well_number else None
                        well.well_type = well_type
                        well.well_status = well_status
                        well.latitude = latitude if latitude != 0.0 else None
                        well.longitude = longitude if longitude != 0.0 else None
                        well.surface_elevation = surface_elevation if surface_elevation != 0.0 else None
                        well.current_operator = current_operator if current_operator else None
                        well.field_name = field_name if field_name else None
                        well.region = region if region else None
                        well.spud_date = datetime.combine(spud_date, datetime.min.time()) if spud_date else None
                        well.completion_date = datetime.combine(completion_date, datetime.min.time()) if completion_date else None
                        well.first_production_date = datetime.combine(first_production_date, datetime.min.time()) if first_production_date else None
                        well.notes = notes if notes else None
                        well.updated_at = datetime.utcnow()

                        session.commit()
                        st.success(f"✅ Well '{well_name}' updated successfully!")

                    except Exception as e:
                        session.rollback()
                        st.error(f"Error updating well: {str(e)}")

    finally:
        session.close()


def delete_well():
    """Delete well"""

    st.subheader("Delete Well")
    st.warning("⚠️ Warning: Deleting a well will also delete all associated data (surveys, drilling records, logs, etc.)")

    session = get_session(st.session_state.db_engine)

    try:
        wells = session.query(Well).order_by(Well.well_name).all()

        if not wells:
            st.info("No wells available to delete.")
            return

        well_names = [w.well_name for w in wells]
        selected_well_name = st.selectbox("Select Well to Delete:", well_names)

        if selected_well_name:
            well = session.query(Well).filter_by(well_name=selected_well_name).first()

            # Show well details
            st.markdown("**Well Details:**")
            col1, col2 = st.columns(2)

            with col1:
                st.write(f"**Name:** {well.well_name}")
                st.write(f"**Type:** {well.well_type or 'N/A'}")
                st.write(f"**Status:** {well.well_status or 'N/A'}")

            with col2:
                st.write(f"**Field:** {well.field_name or 'N/A'}")
                st.write(f"**Operator:** {well.current_operator or 'N/A'}")

            # Confirmation
            confirm = st.checkbox(f"I confirm I want to delete '{selected_well_name}'")

            if st.button("🗑️ Delete Well", type="primary", disabled=not confirm):
                try:
                    session.delete(well)
                    session.commit()
                    st.success(f"✅ Well '{selected_well_name}' deleted successfully!")
                    st.rerun()

                except Exception as e:
                    session.rollback()
                    st.error(f"Error deleting well: {str(e)}")

    finally:
        session.close()
