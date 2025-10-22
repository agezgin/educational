"""
Calculation Utilities
Mathematical models and engineering calculations for well operations
"""

import numpy as np
import math


def calculate_tvd_minimum_curvature(md, inc, azi):
    """
    Calculate TVD, Northing, Easting using minimum curvature method

    Args:
        md: array of measured depths (m)
        inc: array of inclinations (degrees)
        azi: array of azimuths (degrees)

    Returns:
        tuple: (tvd, northing, easting, dogleg_severity)
    """

    if len(md) < 2:
        return [0], [0], [0], [0]

    # Convert to radians
    inc_rad = np.radians(inc)
    azi_rad = np.radians(azi)

    tvd = [0]
    northing = [0]
    easting = [0]
    dogleg = [0]

    for i in range(1, len(md)):
        # Course length
        delta_md = md[i] - md[i-1]

        # Dogleg angle (radians)
        dogleg_rad = np.arccos(
            np.cos(inc_rad[i] - inc_rad[i-1]) -
            np.sin(inc_rad[i]) * np.sin(inc_rad[i-1]) *
            (1 - np.cos(azi_rad[i] - azi_rad[i-1]))
        )

        # Ratio factor
        if dogleg_rad < 0.0001:
            rf = 1.0
        else:
            rf = (2 / dogleg_rad) * np.tan(dogleg_rad / 2)

        # Incremental coordinates
        delta_tvd = 0.5 * delta_md * (np.cos(inc_rad[i]) + np.cos(inc_rad[i-1])) * rf
        delta_north = 0.5 * delta_md * (np.sin(inc_rad[i]) * np.cos(azi_rad[i]) + np.sin(inc_rad[i-1]) * np.cos(azi_rad[i-1])) * rf
        delta_east = 0.5 * delta_md * (np.sin(inc_rad[i]) * np.sin(azi_rad[i]) + np.sin(inc_rad[i-1]) * np.sin(azi_rad[i-1])) * rf

        tvd.append(tvd[-1] + delta_tvd)
        northing.append(northing[-1] + delta_north)
        easting.append(easting[-1] + delta_east)

        # Dogleg severity (deg/30m)
        dls = np.degrees(dogleg_rad) * 30 / delta_md if delta_md > 0 else 0
        dogleg.append(dls)

    return tvd, northing, easting, dogleg


def calculate_rop(depth_out, depth_in, hours):
    """
    Calculate Rate of Penetration

    Args:
        depth_out: final depth (m)
        depth_in: initial depth (m)
        hours: drilling hours

    Returns:
        float: ROP (m/hr)
    """
    if hours <= 0:
        return 0.0

    return (depth_out - depth_in) / hours


def calculate_d_exponent(rop, rpm, wob, bit_diameter):
    """
    Calculate D-exponent for pore pressure detection

    Args:
        rop: rate of penetration (m/hr)
        rpm: rotations per minute
        wob: weight on bit (kN)
        bit_diameter: bit diameter (mm)

    Returns:
        float: D-exponent
    """
    if rpm <= 0 or wob <= 0 or bit_diameter <= 0:
        return 0.0

    numerator = rop / (60 * rpm)
    denominator = (12 * wob) / (1000 * bit_diameter)

    if numerator <= 0 or denominator <= 0:
        return 0.0

    try:
        d_exp = math.log10(numerator) / math.log10(denominator)
        return d_exp
    except (ValueError, ZeroDivisionError):
        return 0.0


def calculate_corrected_d_exponent(d_exp, mud_weight, normal_gradient=0.1):
    """
    Calculate corrected D-exponent

    Args:
        d_exp: D-exponent
        mud_weight: mud weight (kg/l)
        normal_gradient: normal pore pressure gradient (bar/m)

    Returns:
        float: corrected D-exponent
    """
    if mud_weight <= 0:
        return 0.0

    mud_gradient = mud_weight * 0.0981  # Convert kg/l to bar/m
    dc = d_exp * (normal_gradient / mud_gradient)

    return dc


def calculate_ecd(mud_weight, tvd, annular_pressure_loss):
    """
    Calculate Equivalent Circulating Density

    Args:
        mud_weight: static mud weight (kg/l)
        tvd: true vertical depth (m)
        annular_pressure_loss: pressure loss in annulus (bar)

    Returns:
        float: ECD (kg/l)
    """
    if tvd <= 0:
        return mud_weight

    # Convert pressure loss to equivalent mud weight
    pressure_gradient = annular_pressure_loss / tvd
    ecd = mud_weight + (pressure_gradient / 0.0981)

    return ecd


def calculate_hydrostatic_pressure(mud_weight, tvd):
    """
    Calculate hydrostatic pressure

    Args:
        mud_weight: mud weight (kg/l)
        tvd: true vertical depth (m)

    Returns:
        float: hydrostatic pressure (bar)
    """
    # Pressure (bar) = mud weight (kg/l) * depth (m) * 0.0981
    return mud_weight * tvd * 0.0981


def calculate_fracture_gradient(fracture_pressure, tvd):
    """
    Calculate fracture gradient

    Args:
        fracture_pressure: fracture pressure at depth (bar)
        tvd: true vertical depth (m)

    Returns:
        float: fracture gradient (bar/m)
    """
    if tvd <= 0:
        return 0.0

    return fracture_pressure / tvd


def calculate_mud_weight_from_pressure(pressure, tvd):
    """
    Calculate required mud weight from pressure

    Args:
        pressure: pressure (bar)
        tvd: true vertical depth (m)

    Returns:
        float: mud weight (kg/l)
    """
    if tvd <= 0:
        return 0.0

    return pressure / (tvd * 0.0981)


def calculate_annular_velocity(flow_rate, hole_diameter, pipe_od):
    """
    Calculate annular velocity

    Args:
        flow_rate: flow rate (l/min)
        hole_diameter: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)

    Returns:
        float: annular velocity (m/s)
    """
    # Convert to metric
    hole_dia_m = hole_diameter * 0.0254
    pipe_od_m = pipe_od * 0.0254

    # Annular area (m²)
    annular_area = (math.pi / 4) * (hole_dia_m**2 - pipe_od_m**2)

    if annular_area <= 0:
        return 0.0

    # Flow rate in m³/s
    flow_rate_m3s = flow_rate / 60000

    # Velocity (m/s)
    velocity = flow_rate_m3s / annular_area

    return velocity


def calculate_jet_velocity(flow_rate, nozzle_area):
    """
    Calculate jet velocity

    Args:
        flow_rate: flow rate (l/min)
        nozzle_area: total nozzle area (mm²)

    Returns:
        float: jet velocity (m/s)
    """
    if nozzle_area <= 0:
        return 0.0

    # Convert to metric
    flow_rate_m3s = flow_rate / 60000  # l/min to m³/s
    nozzle_area_m2 = nozzle_area / 1000000  # mm² to m²

    velocity = flow_rate_m3s / nozzle_area_m2

    return velocity


def calculate_hydraulic_horsepower(pressure, flow_rate):
    """
    Calculate hydraulic horsepower

    Args:
        pressure: pressure (bar)
        flow_rate: flow rate (l/min)

    Returns:
        float: hydraulic horsepower (HP)
    """
    # HHP = (Pressure in psi * Flow rate in gpm) / 1714
    # Convert bar to psi: 1 bar = 14.5038 psi
    # Convert l/min to gpm: 1 l/min = 0.264172 gpm

    pressure_psi = pressure * 14.5038
    flow_gpm = flow_rate * 0.264172

    hhp = (pressure_psi * flow_gpm) / 1714

    return hhp


def calculate_casing_burst_pressure(grade, od, wall_thickness):
    """
    Simplified casing burst pressure calculation

    Args:
        grade: casing grade (yield strength in ksi)
        od: outer diameter (inches)
        wall_thickness: wall thickness (inches)

    Returns:
        float: burst pressure (psi)
    """
    # Simplified API formula
    # Burst = 2 * Yield * Wall Thickness / OD

    grade_values = {
        'J55': 55,
        'K55': 55,
        'N80': 80,
        'L80': 80,
        'P110': 110,
        'Q125': 125
    }

    yield_strength = grade_values.get(grade, 80)

    burst_pressure = (2 * yield_strength * 1000 * wall_thickness) / od

    return burst_pressure


def calculate_displacement_volume(od, id_pipe, length):
    """
    Calculate displacement volume

    Args:
        od: outer diameter (inches)
        id_pipe: inner diameter (inches)
        length: length (m)

    Returns:
        float: volume (m³)
    """
    # Convert to metric
    od_m = od * 0.0254
    id_m = id_pipe * 0.0254

    # Cross-sectional area
    area = (math.pi / 4) * (od_m**2 - id_m**2)

    # Volume
    volume = area * length

    return volume


def calculate_critical_flow_rate(hole_diameter, pipe_od, mud_weight, mud_viscosity):
    """
    Calculate critical flow rate for laminar/turbulent transition

    Args:
        hole_diameter: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)
        mud_weight: mud weight (kg/l)
        mud_viscosity: mud viscosity (cP)

    Returns:
        float: critical flow rate (l/min)
    """
    # Simplified calculation
    # This is a placeholder - actual calculation requires more parameters

    return 500.0  # Placeholder value
