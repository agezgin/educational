"""
Visualization Utilities
Plotly and Folium visualization functions for well data
"""

import plotly.graph_objects as go
import plotly.express as px
import folium
from folium import plugins
import numpy as np


def create_wells_map(wells, center_lat=None, center_lon=None, zoom_start=10):
    """
    Create interactive map with well locations using Folium

    Args:
        wells: list of Well objects
        center_lat: center latitude (optional)
        center_lon: center longitude (optional)
        zoom_start: initial zoom level

    Returns:
        folium.Map: interactive map
    """

    # Calculate center if not provided
    if center_lat is None or center_lon is None:
        lats = [w.latitude for w in wells if w.latitude]
        lons = [w.longitude for w in wells if w.longitude]

        if lats and lons:
            center_lat = sum(lats) / len(lats)
            center_lon = sum(lons) / len(lons)
        else:
            center_lat = 0
            center_lon = 0

    # Create map
    well_map = folium.Map(
        location=[center_lat, center_lon],
        zoom_start=zoom_start,
        tiles='OpenStreetMap'
    )

    # Add alternative tile layers
    folium.TileLayer('Stamen Terrain', name='Terrain').add_to(well_map)
    folium.TileLayer('Stamen Toner', name='Toner').add_to(well_map)
    folium.TileLayer('CartoDB positron', name='CartoDB').add_to(well_map)

    # Define colors for different well statuses
    status_colors = {
        'Producing': 'green',
        'Drilling': 'orange',
        'Completed': 'blue',
        'Shut-in': 'red',
        'Abandoned': 'gray',
        'P&A': 'darkgray',
        'Planned': 'lightblue'
    }

    # Add markers for each well
    for well in wells:
        if well.latitude and well.longitude:
            # Determine color based on status
            color = status_colors.get(well.well_status, 'purple')

            # Create popup content
            popup_html = f"""
            <div style="font-family: Arial; width: 250px;">
                <h4 style="margin-bottom: 10px; color: #1f77b4;">{well.well_name}</h4>
                <table style="width: 100%; font-size: 12px;">
                    <tr><td><b>Number:</b></td><td>{well.well_number or 'N/A'}</td></tr>
                    <tr><td><b>Type:</b></td><td>{well.well_type or 'N/A'}</td></tr>
                    <tr><td><b>Status:</b></td><td><span style="color: {color}; font-weight: bold;">{well.well_status or 'N/A'}</span></td></tr>
                    <tr><td><b>Field:</b></td><td>{well.field_name or 'N/A'}</td></tr>
                    <tr><td><b>Operator:</b></td><td>{well.current_operator or 'N/A'}</td></tr>
                    <tr><td><b>Location:</b></td><td>{well.latitude:.6f}, {well.longitude:.6f}</td></tr>
                </table>
            </div>
            """

            # Add marker
            folium.Marker(
                location=[well.latitude, well.longitude],
                popup=folium.Popup(popup_html, max_width=300),
                tooltip=well.well_name,
                icon=folium.Icon(color=color, icon='tint', prefix='fa')
            ).add_to(well_map)

            # Add circle marker for better visibility
            folium.CircleMarker(
                location=[well.latitude, well.longitude],
                radius=8,
                color=color,
                fill=True,
                fillColor=color,
                fillOpacity=0.6,
                weight=2
            ).add_to(well_map)

    # Add layer control
    folium.LayerControl().add_to(well_map)

    # Add fullscreen option
    plugins.Fullscreen().add_to(well_map)

    # Add measure control
    plugins.MeasureControl(position='topleft', primary_length_unit='meters').add_to(well_map)

    # Add mouse position
    plugins.MousePosition().add_to(well_map)

    return well_map


def create_3d_trajectory_plot(md, tvd, northing, easting, well_name="Well"):
    """
    Create 3D trajectory plot using Plotly

    Args:
        md: measured depth array
        tvd: true vertical depth array
        northing: northing array
        easting: easting array
        well_name: well name for title

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure(data=[go.Scatter3d(
        x=easting,
        y=northing,
        z=[-t for t in tvd],  # Negative for depth
        mode='lines+markers',
        marker=dict(
            size=5,
            color=md,
            colorscale='Viridis',
            colorbar=dict(title="MD (m)"),
            showscale=True
        ),
        line=dict(color='blue', width=3),
        text=[f"MD: {m:.1f}m<br>TVD: {t:.1f}m<br>N: {n:.1f}m<br>E: {e:.1f}m"
              for m, t, n, e in zip(md, tvd, northing, easting)],
        hoverinfo='text',
        name='Trajectory'
    )])

    fig.update_layout(
        title=f"3D Well Trajectory - {well_name}",
        scene=dict(
            xaxis_title="Easting (m)",
            yaxis_title="Northing (m)",
            zaxis_title="TVD (m)",
            aspectmode='data',
            camera=dict(
                eye=dict(x=1.5, y=1.5, z=1.2)
            )
        ),
        height=600,
        hovermode='closest'
    )

    return fig


def create_vertical_section_plot(md, tvd, inc, well_name="Well"):
    """
    Create vertical section plot

    Args:
        md: measured depth array
        tvd: true vertical depth array
        inc: inclination array
        well_name: well name

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    # Main trajectory
    fig.add_trace(go.Scatter(
        x=md,
        y=tvd,
        mode='lines+markers',
        name='Trajectory',
        line=dict(color='blue', width=2),
        marker=dict(size=6, color=inc, colorscale='Reds', showscale=True, colorbar=dict(title="Inc (°)"))
    ))

    # Vertical reference line
    fig.add_trace(go.Scatter(
        x=[0, 0],
        y=[0, max(tvd) if tvd else 1000],
        mode='lines',
        name='Vertical',
        line=dict(color='gray', width=1, dash='dash')
    ))

    fig.update_layout(
        title=f"Vertical Section - {well_name}",
        xaxis_title="Departure (m)",
        yaxis_title="TVD (m)",
        yaxis=dict(autorange='reversed'),
        height=600,
        hovermode='x unified'
    )

    return fig


def create_rop_depth_plot(depths, rops, well_names=None):
    """
    Create ROP vs Depth plot

    Args:
        depths: list of depth arrays
        rops: list of ROP arrays
        well_names: list of well names (optional)

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    if not isinstance(depths[0], (list, np.ndarray)):
        depths = [depths]
        rops = [rops]

    if well_names is None:
        well_names = [f"Well {i+1}" for i in range(len(depths))]

    colors = px.colors.qualitative.Plotly

    for i, (depth, rop, name) in enumerate(zip(depths, rops, well_names)):
        fig.add_trace(go.Scatter(
            x=rop,
            y=depth,
            mode='lines+markers',
            name=name,
            line=dict(color=colors[i % len(colors)], width=2),
            marker=dict(size=5)
        ))

    fig.update_layout(
        title="Rate of Penetration vs Depth",
        xaxis_title="ROP (m/hr)",
        yaxis_title="Depth (m)",
        yaxis=dict(autorange='reversed'),
        height=600,
        hovermode='y unified',
        legend=dict(x=0.7, y=0.98)
    )

    return fig


def create_pressure_plot(depths, pore_pressures, frac_pressures, overburden=None, well_name="Well"):
    """
    Create pressure vs depth plot

    Args:
        depths: depth array
        pore_pressures: pore pressure array
        frac_pressures: fracture pressure array
        overburden: overburden stress array (optional)
        well_name: well name

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    # Pore pressure
    fig.add_trace(go.Scatter(
        x=pore_pressures,
        y=depths,
        mode='lines+markers',
        name='Pore Pressure',
        line=dict(color='blue', width=2),
        marker=dict(size=6)
    ))

    # Fracture pressure
    fig.add_trace(go.Scatter(
        x=frac_pressures,
        y=depths,
        mode='lines+markers',
        name='Fracture Pressure',
        line=dict(color='red', width=2),
        marker=dict(size=6)
    ))

    # Overburden (if provided)
    if overburden is not None:
        fig.add_trace(go.Scatter(
            x=overburden,
            y=depths,
            mode='lines+markers',
            name='Overburden',
            line=dict(color='green', width=2),
            marker=dict(size=6)
        ))

    fig.update_layout(
        title=f"Pressure Profile - {well_name}",
        xaxis_title="Pressure (bar)",
        yaxis_title="Depth (m)",
        yaxis=dict(autorange='reversed'),
        height=600,
        hovermode='y unified',
        legend=dict(x=0.7, y=0.98)
    )

    return fig


def create_mud_weight_window_plot(depths, mw_min, mw_max, current_mw=None, well_name="Well"):
    """
    Create mud weight window plot

    Args:
        depths: depth array
        mw_min: minimum mud weight array
        mw_max: maximum mud weight array
        current_mw: current mud weight array (optional)
        well_name: well name

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    # Fill area between min and max
    fig.add_trace(go.Scatter(
        x=mw_min,
        y=depths,
        mode='lines',
        name='Min MW (Stability)',
        line=dict(color='orange', width=2)
    ))

    fig.add_trace(go.Scatter(
        x=mw_max,
        y=depths,
        mode='lines',
        name='Max MW (Fracture)',
        line=dict(color='red', width=2),
        fill='tonextx',
        fillcolor='rgba(255, 200, 200, 0.3)'
    ))

    # Current mud weight (if provided)
    if current_mw is not None:
        fig.add_trace(go.Scatter(
            x=current_mw,
            y=depths,
            mode='lines+markers',
            name='Current MW',
            line=dict(color='blue', width=2, dash='dash'),
            marker=dict(size=6)
        ))

    fig.update_layout(
        title=f"Mud Weight Window - {well_name}",
        xaxis_title="Mud Weight (kg/l)",
        yaxis_title="Depth (m)",
        yaxis=dict(autorange='reversed'),
        height=600,
        hovermode='y unified',
        legend=dict(x=0.7, y=0.98)
    )

    return fig


def create_completion_schematic(casing_sizes, casing_depths, tubing_size=None, tubing_depth=None,
                                 perf_top=None, perf_bottom=None, well_name="Well"):
    """
    Create completion schematic

    Args:
        casing_sizes: list of casing sizes (inches)
        casing_depths: list of casing depths (m)
        tubing_size: tubing size (inches, optional)
        tubing_depth: tubing depth (m, optional)
        perf_top: perforation top depth (m, optional)
        perf_bottom: perforation bottom depth (m, optional)
        well_name: well name

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    # Convert inches to mm for visualization
    colors = ['gray', 'darkgray', 'lightgray']

    # Draw casing strings
    for i, (size, depth) in enumerate(zip(casing_sizes, casing_depths)):
        radius = size / 2 * 25.4  # Convert to mm

        fig.add_trace(go.Scatter(
            x=[-radius, -radius, radius, radius, -radius],
            y=[0, -depth, -depth, 0, 0],
            mode='lines',
            name=f'Casing {size}"',
            line=dict(color=colors[i % len(colors)], width=4),
            fill='toself',
            fillcolor=f'rgba(128, 128, 128, {0.1 * (i + 1)})'
        ))

    # Draw tubing
    if tubing_size and tubing_depth:
        radius = tubing_size / 2 * 25.4

        fig.add_trace(go.Scatter(
            x=[-radius, -radius, radius, radius, -radius],
            y=[0, -tubing_depth, -tubing_depth, 0, 0],
            mode='lines',
            name=f'Tubing {tubing_size}"',
            line=dict(color='blue', width=3)
        ))

    # Draw perforation interval
    if perf_top and perf_bottom:
        max_radius = max(casing_sizes) / 2 * 25.4 * 1.2

        fig.add_trace(go.Scatter(
            x=[-max_radius, max_radius],
            y=[-perf_top, -perf_top],
            mode='lines',
            name='Perf Top',
            line=dict(color='red', width=2, dash='dash')
        ))

        fig.add_trace(go.Scatter(
            x=[-max_radius, max_radius],
            y=[-perf_bottom, -perf_bottom],
            mode='lines',
            name='Perf Bottom',
            line=dict(color='red', width=2, dash='dash')
        ))

        # Shade perforation interval
        fig.add_trace(go.Scatter(
            x=[-max_radius, -max_radius, max_radius, max_radius, -max_radius],
            y=[-perf_top, -perf_bottom, -perf_bottom, -perf_top, -perf_top],
            fill='toself',
            fillcolor='rgba(255, 0, 0, 0.1)',
            line=dict(width=0),
            showlegend=False,
            hoverinfo='skip'
        ))

    fig.update_layout(
        title=f"Completion Schematic - {well_name}",
        xaxis_title="Radius (mm)",
        yaxis_title="Depth (m)",
        height=700,
        showlegend=True,
        hovermode='closest'
    )

    return fig


def create_time_series_plot(dates, values, title, yaxis_title, line_color='blue'):
    """
    Create generic time series plot

    Args:
        dates: list of dates
        values: list of values
        title: plot title
        yaxis_title: y-axis title
        line_color: line color

    Returns:
        plotly.graph_objects.Figure
    """

    fig = go.Figure()

    fig.add_trace(go.Scatter(
        x=dates,
        y=values,
        mode='lines+markers',
        line=dict(color=line_color, width=2),
        marker=dict(size=6)
    ))

    fig.update_layout(
        title=title,
        xaxis_title="Date",
        yaxis_title=yaxis_title,
        height=400,
        hovermode='x unified'
    )

    return fig
