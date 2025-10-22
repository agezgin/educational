"""
Production Module
Daily production tracking, well testing, and performance monitoring
"""

import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import plotly.express as px
from datetime import datetime, date, timedelta
from database.models import Well, ProductionRecord, get_session


def show():
    """Main production interface"""

    st.header("📈 Production Monitoring")

    if not st.session_state.selected_well_id:
        st.warning("⚠️ Please select a well from the sidebar first")
        return

    tabs = st.tabs(["📋 Production Data", "➕ Add Record", "📊 Performance Analysis", "🧪 Well Testing"])

    with tabs[0]:
        show_production_data()

    with tabs[1]:
        add_production_record()

    with tabs[2]:
        performance_analysis()

    with tabs[3]:
        well_testing()


def show_production_data():
    """Display production records"""

    st.subheader("Production Records")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Well: **{well.well_name}**")

        records = session.query(ProductionRecord).filter_by(well_id=well.id).order_by(ProductionRecord.date.desc()).all()

        if records:
            prod_data = []
            for r in records:
                prod_data.append({
                    'Date': r.date.strftime('%Y-%m-%d') if r.date else 'N/A',
                    'Oil (m³/d)': f"{r.oil_rate:.2f}" if r.oil_rate else 'N/A',
                    'Gas (m³/d)': f"{r.gas_rate:.2f}" if r.gas_rate else 'N/A',
                    'Water (m³/d)': f"{r.water_rate:.2f}" if r.water_rate else 'N/A',
                    'THP (bar)': f"{r.tubing_head_pressure:.1f}" if r.tubing_head_pressure else 'N/A',
                    'CHP (bar)': f"{r.casing_head_pressure:.1f}" if r.casing_head_pressure else 'N/A',
                    'Temp (°C)': f"{r.wellhead_temperature:.1f}" if r.wellhead_temperature else 'N/A',
                    'Choke (mm)': f"{r.choke_size:.1f}" if r.choke_size else 'N/A',
                    'Well Test': '✓' if r.is_well_test else ''
                })

            df = pd.DataFrame(prod_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Statistics
            col1, col2, col3, col4 = st.columns(4)

            with col1:
                avg_oil = sum(r.oil_rate for r in records if r.oil_rate) / len([r for r in records if r.oil_rate]) if any(r.oil_rate for r in records) else 0
                st.metric("Avg Oil Rate", f"{avg_oil:.2f} m³/d")

            with col2:
                avg_gas = sum(r.gas_rate for r in records if r.gas_rate) / len([r for r in records if r.gas_rate]) if any(r.gas_rate for r in records) else 0
                st.metric("Avg Gas Rate", f"{avg_gas:.2f} m³/d")

            with col3:
                total_oil = sum(r.oil_rate for r in records if r.oil_rate) or 0
                st.metric("Total Oil", f"{total_oil:.1f} m³")

            with col4:
                water_cut = 0
                if any(r.water_rate for r in records) and any(r.oil_rate for r in records):
                    total_water = sum(r.water_rate for r in records if r.water_rate) or 0
                    total_liquid = total_oil + total_water
                    water_cut = (total_water / total_liquid * 100) if total_liquid > 0 else 0
                st.metric("Water Cut", f"{water_cut:.1f}%")

            # Export
            csv = df.to_csv(index=False).encode('utf-8')
            st.download_button(
                label="📥 Download as CSV",
                data=csv,
                file_name=f"{well.well_name}_production_{datetime.now().strftime('%Y%m%d')}.csv",
                mime="text/csv"
            )

        else:
            st.info("No production records available. Add records using 'Add Record' tab.")

    finally:
        session.close()


def add_production_record():
    """Add production record"""

    st.subheader("Add Daily Production Record")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()

        if not well:
            st.error("Well not found")
            return

        st.info(f"Adding record for: **{well.well_name}**")

        with st.form("add_production_form"):
            col1, col2, col3 = st.columns(3)

            with col1:
                st.markdown("**Date & Production Rates**")
                prod_date = st.date_input("Production Date *", value=datetime.now())
                oil_rate = st.number_input("Oil Rate (m³/day)", min_value=0.0, value=0.0, format="%.2f")
                gas_rate = st.number_input("Gas Rate (m³/day)", min_value=0.0, value=0.0, format="%.2f")
                water_rate = st.number_input("Water Rate (m³/day)", min_value=0.0, value=0.0, format="%.2f")

            with col2:
                st.markdown("**Pressures & Temperature**")
                thp = st.number_input("Tubing Head Pressure (bar)", min_value=0.0, value=0.0, format="%.1f")
                chp = st.number_input("Casing Head Pressure (bar)", min_value=0.0, value=0.0, format="%.1f")
                temp = st.number_input("Wellhead Temperature (°C)", min_value=0.0, value=20.0, format="%.1f")
                choke_size = st.number_input("Choke Size (mm)", min_value=0.0, value=0.0, format="%.1f")

            with col3:
                st.markdown("**Well Test**")
                is_test = st.checkbox("Is Well Test?", value=False)
                test_duration = st.number_input("Test Duration (hours)", min_value=0.0, value=0.0, format="%.1f", disabled=not is_test)

                st.markdown("**Comments**")
                comments = st.text_area("Comments", placeholder="Additional notes...")

            submitted = st.form_submit_button("✅ Add Production Record", use_container_width=True)

            if submitted:
                try:
                    new_record = ProductionRecord(
                        well_id=well.id,
                        date=datetime.combine(prod_date, datetime.min.time()),
                        oil_rate=oil_rate if oil_rate > 0 else None,
                        gas_rate=gas_rate if gas_rate > 0 else None,
                        water_rate=water_rate if water_rate > 0 else None,
                        tubing_head_pressure=thp if thp > 0 else None,
                        casing_head_pressure=chp if chp > 0 else None,
                        wellhead_temperature=temp if temp > 0 else None,
                        choke_size=choke_size if choke_size > 0 else None,
                        is_well_test=is_test,
                        test_duration=test_duration if test_duration > 0 and is_test else None,
                        comments=comments if comments else None
                    )

                    session.add(new_record)
                    session.commit()

                    st.success(f"✅ Production record added for {prod_date}")

                except Exception as e:
                    session.rollback()
                    st.error(f"Error adding record: {str(e)}")

    finally:
        session.close()


def performance_analysis():
    """Production performance analysis"""

    st.subheader("Production Performance Analysis")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        records = session.query(ProductionRecord).filter_by(well_id=well.id).order_by(ProductionRecord.date).all()

        if not records or len(records) < 2:
            st.info("Need at least 2 production records for analysis")
            return

        # Extract data
        dates = [r.date for r in records]
        oil_rates = [r.oil_rate if r.oil_rate else 0 for r in records]
        gas_rates = [r.gas_rate if r.gas_rate else 0 for r in records]
        water_rates = [r.water_rate if r.water_rate else 0 for r in records]

        # Production rates over time
        fig1 = go.Figure()

        if any(oil_rates):
            fig1.add_trace(go.Scatter(
                x=dates,
                y=oil_rates,
                mode='lines+markers',
                name='Oil',
                line=dict(color='green', width=2)
            ))

        if any(gas_rates):
            fig1.add_trace(go.Scatter(
                x=dates,
                y=gas_rates,
                mode='lines+markers',
                name='Gas',
                line=dict(color='red', width=2)
            ))

        if any(water_rates):
            fig1.add_trace(go.Scatter(
                x=dates,
                y=water_rates,
                mode='lines+markers',
                name='Water',
                line=dict(color='blue', width=2)
            ))

        fig1.update_layout(
            title=f"Production Rates - {well.well_name}",
            xaxis_title="Date",
            yaxis_title="Rate (m³/day)",
            height=500,
            hovermode='x unified'
        )

        st.plotly_chart(fig1, use_container_width=True)

        # Water cut analysis
        liquid_rates = [o + w for o, w in zip(oil_rates, water_rates)]
        water_cuts = [(w / l * 100) if l > 0 else 0 for w, l in zip(water_rates, liquid_rates)]

        if any(water_cuts):
            fig2 = px.line(
                x=dates,
                y=water_cuts,
                markers=True,
                title="Water Cut Trend"
            )

            fig2.update_layout(
                xaxis_title="Date",
                yaxis_title="Water Cut (%)",
                height=400
            )

            st.plotly_chart(fig2, use_container_width=True)

        # Pressure trends
        thp_values = [r.tubing_head_pressure if r.tubing_head_pressure else 0 for r in records]

        if any(thp_values):
            fig3 = px.line(
                x=dates,
                y=thp_values,
                markers=True,
                title="Tubing Head Pressure"
            )

            fig3.update_layout(
                xaxis_title="Date",
                yaxis_title="THP (bar)",
                height=400
            )

            st.plotly_chart(fig3, use_container_width=True)

        # Cumulative production
        cumulative_oil = []
        cumulative_gas = []
        cum_oil = 0
        cum_gas = 0

        for oil, gas in zip(oil_rates, gas_rates):
            cum_oil += oil
            cum_gas += gas
            cumulative_oil.append(cum_oil)
            cumulative_gas.append(cum_gas)

        fig4 = go.Figure()

        fig4.add_trace(go.Scatter(
            x=dates,
            y=cumulative_oil,
            mode='lines+markers',
            name='Cumulative Oil',
            line=dict(color='green', width=2)
        ))

        fig4.add_trace(go.Scatter(
            x=dates,
            y=cumulative_gas,
            mode='lines+markers',
            name='Cumulative Gas',
            line=dict(color='red', width=2),
            yaxis='y2'
        ))

        fig4.update_layout(
            title="Cumulative Production",
            xaxis_title="Date",
            yaxis_title="Cumulative Oil (m³)",
            yaxis2=dict(title="Cumulative Gas (m³)", overlaying='y', side='right'),
            height=500
        )

        st.plotly_chart(fig4, use_container_width=True)

    finally:
        session.close()


def well_testing():
    """Well testing data and analysis"""

    st.subheader("Well Testing")

    session = get_session(st.session_state.db_engine)

    try:
        well = session.query(Well).filter_by(id=st.session_state.selected_well_id).first()
        test_records = session.query(ProductionRecord).filter_by(
            well_id=well.id,
            is_well_test=True
        ).order_by(ProductionRecord.date.desc()).all()

        if test_records:
            st.write(f"**Well:** {well.well_name}")
            st.write(f"**Total Well Tests:** {len(test_records)}")

            test_data = []
            for r in test_records:
                test_data.append({
                    'Date': r.date.strftime('%Y-%m-%d') if r.date else 'N/A',
                    'Duration (hrs)': f"{r.test_duration:.1f}" if r.test_duration else 'N/A',
                    'Oil (m³/d)': f"{r.oil_rate:.2f}" if r.oil_rate else 'N/A',
                    'Gas (m³/d)': f"{r.gas_rate:.2f}" if r.gas_rate else 'N/A',
                    'Water (m³/d)': f"{r.water_rate:.2f}" if r.water_rate else 'N/A',
                    'THP (bar)': f"{r.tubing_head_pressure:.1f}" if r.tubing_head_pressure else 'N/A',
                    'Choke (mm)': f"{r.choke_size:.1f}" if r.choke_size else 'N/A'
                })

            df = pd.DataFrame(test_data)
            st.dataframe(df, use_container_width=True, hide_index=True)

            # Well test comparison
            if len(test_records) >= 2:
                dates = [r.date for r in test_records]
                oil_rates = [r.oil_rate if r.oil_rate else 0 for r in test_records]

                fig = px.bar(
                    x=dates,
                    y=oil_rates,
                    title="Well Test Oil Rates Comparison",
                    labels={'x': 'Test Date', 'y': 'Oil Rate (m³/day)'}
                )

                st.plotly_chart(fig, use_container_width=True)

        else:
            st.info("No well test data available. Add production records and mark them as well tests.")

    finally:
        session.close()
