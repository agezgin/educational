"""
Hole Cleaning and Cuttings Transport Models
Advanced models for cuttings transport efficiency and hole cleaning optimization
"""

import numpy as np
import math


def calculate_slip_velocity(cuttings_diameter, cuttings_density, mud_weight, mud_viscosity):
    """
    Calculate cuttings slip velocity using Stokes' Law

    Args:
        cuttings_diameter: cuttings diameter (mm)
        cuttings_density: cuttings density (g/cm³)
        mud_weight: mud weight (kg/l)
        mud_viscosity: mud viscosity (cP)

    Returns:
        float: slip velocity (m/s)
    """
    # Convert units
    d = cuttings_diameter / 1000  # m
    rho_c = cuttings_density * 1000  # kg/m³
    rho_m = mud_weight * 1000  # kg/m³
    mu = mud_viscosity / 1000  # Pa.s

    # Stokes' Law (for laminar flow)
    g = 9.81  # m/s²

    slip_velocity = (g * d**2 * (rho_c - rho_m)) / (18 * mu)

    return abs(slip_velocity)


def calculate_cuttings_transport_ratio(annular_velocity, slip_velocity, inclination):
    """
    Calculate cuttings transport ratio

    Args:
        annular_velocity: annular velocity (m/s)
        slip_velocity: cuttings slip velocity (m/s)
        inclination: wellbore inclination (degrees)

    Returns:
        float: transport ratio (>1 means good cleaning)
    """
    inc_rad = math.radians(inclination)

    # Effective velocity component along hole axis
    v_axial = annular_velocity * math.cos(inc_rad)

    # Slip velocity component
    v_slip_axial = slip_velocity * math.cos(inc_rad)

    # Transport ratio
    transport_ratio = v_axial / v_slip_axial if v_slip_axial > 0 else float('inf')

    return transport_ratio


def calculate_critical_transport_velocity(cuttings_diameter, cuttings_density,
                                          mud_weight, mud_viscosity, inclination):
    """
    Calculate critical velocity for cuttings transport

    Args:
        cuttings_diameter: cuttings diameter (mm)
        cuttings_density: cuttings density (g/cm³)
        mud_weight: mud weight (kg/l)
        mud_viscosity: mud viscosity (cP)
        inclination: wellbore inclination (degrees)

    Returns:
        float: critical velocity (m/s)
    """
    # Calculate slip velocity
    vs = calculate_slip_velocity(cuttings_diameter, cuttings_density,
                                 mud_weight, mud_viscosity)

    # Inclination effect
    inc_rad = math.radians(inclination)

    # Critical velocity (Moore correlation)
    # For vertical sections
    if inclination < 30:
        vc = 1.5 * vs  # Safety factor for vertical
    # For inclined sections (30-60 degrees) - most critical
    elif inclination < 60:
        # Increase required velocity
        angle_factor = 1 + math.sin(inc_rad)
        vc = angle_factor * 2.0 * vs
    # For near-horizontal sections
    else:
        vc = 2.5 * vs

    return vc


def calculate_hole_cleaning_index(actual_velocity, critical_velocity):
    """
    Calculate hole cleaning index

    Args:
        actual_velocity: actual annular velocity (m/s)
        critical_velocity: critical transport velocity (m/s)

    Returns:
        dict: hole cleaning analysis
    """
    ratio = actual_velocity / critical_velocity if critical_velocity > 0 else 0

    analysis = {
        'actual_velocity': actual_velocity,
        'critical_velocity': critical_velocity,
        'ratio': ratio,
        'status': 'unknown'
    }

    if ratio >= 1.2:
        analysis['status'] = 'excellent'
        analysis['cleaning_efficiency'] = '> 95%'
        analysis['recommendation'] = 'Good hole cleaning - continue current parameters'
    elif ratio >= 1.0:
        analysis['status'] = 'adequate'
        analysis['cleaning_efficiency'] = '80-95%'
        analysis['recommendation'] = 'Acceptable - monitor for cuttings build-up'
    elif ratio >= 0.8:
        analysis['status'] = 'marginal'
        analysis['cleaning_efficiency'] = '60-80%'
        analysis['recommendation'] = 'Increase flow rate or reduce ROP'
    else:
        analysis['status'] = 'poor'
        analysis['cleaning_efficiency'] = '< 60%'
        analysis['recommendation'] = 'Risk of stuck pipe - increase flow rate immediately'

    return analysis


def calculate_cuttings_concentration(rop, bit_diameter, flow_rate):
    """
    Calculate cuttings concentration in annulus

    Args:
        rop: rate of penetration (m/hr)
        bit_diameter: bit diameter (mm)
        flow_rate: flow rate (l/min)

    Returns:
        float: cuttings concentration (%)
    """
    # Bit area
    bit_area = math.pi * (bit_diameter / 1000 / 2) ** 2  # m²

    # Volume of rock drilled per minute
    rop_m_per_min = rop / 60  # m/min
    rock_volume = bit_area * rop_m_per_min * 1000  # liters/min

    # Flow rate
    total_volume = flow_rate  # l/min

    # Cuttings concentration
    concentration = (rock_volume / total_volume) * 100 if total_volume > 0 else 0

    return concentration


def calculate_cuttings_bed_height(cuttings_concentration, annular_height,
                                 inclination, transport_efficiency=0.7):
    """
    Calculate cuttings bed height in inclined sections

    Args:
        cuttings_concentration: cuttings concentration (%)
        annular_height: annular space height (mm)
        inclination: wellbore inclination (degrees)
        transport_efficiency: transport efficiency (0-1, default 0.7)

    Returns:
        float: bed height (mm)
    """
    # Inclination factor (beds form mainly in 30-60 degree sections)
    inc_rad = math.radians(inclination)

    if inclination < 30:
        bed_factor = 0.1  # Minimal bed in vertical
    elif inclination < 60:
        bed_factor = 1.0 * math.sin(inc_rad)  # Maximum bed in inclined
    else:
        bed_factor = 0.5  # Reduced bed in near-horizontal

    # Calculate bed height
    concentration_fraction = cuttings_concentration / 100
    inefficiency = 1 - transport_efficiency

    bed_height = annular_height * concentration_fraction * inefficiency * bed_factor

    return bed_height


def calculate_flow_rate_for_hole_cleaning(hole_diameter, pipe_od, rop, bit_diameter,
                                          cuttings_density, mud_weight, mud_viscosity,
                                          inclination, target_concentration=5.0):
    """
    Calculate required flow rate for effective hole cleaning

    Args:
        hole_diameter: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)
        rop: rate of penetration (m/hr)
        bit_diameter: bit diameter (mm)
        cuttings_density: cuttings density (g/cm³)
        mud_weight: mud weight (kg/l)
        mud_viscosity: mud viscosity (cP)
        inclination: wellbore inclination (degrees)
        target_concentration: target cuttings concentration (%, default 5%)

    Returns:
        dict: flow rate recommendations
    """
    # Calculate cuttings generation rate
    bit_area = math.pi * (bit_diameter / 1000 / 2) ** 2  # m²
    rop_m_per_min = rop / 60
    rock_volume = bit_area * rop_m_per_min * 1000  # l/min

    # Required flow rate based on concentration
    flow_rate_concentration = rock_volume / (target_concentration / 100)

    # Calculate critical velocity
    cuttings_diameter = 5.0  # mm, typical
    critical_velocity = calculate_critical_transport_velocity(
        cuttings_diameter, cuttings_density, mud_weight, mud_viscosity, inclination
    )

    # Calculate annular area
    dh = hole_diameter * 0.0254  # m
    dp = pipe_od * 0.0254  # m
    annular_area = (math.pi / 4) * (dh**2 - dp**2)  # m²

    # Required flow rate based on velocity
    flow_rate_velocity = critical_velocity * annular_area * 60000  # l/min

    # Take maximum of both requirements
    required_flow_rate = max(flow_rate_concentration, flow_rate_velocity)

    # Add safety margin
    recommended_flow_rate = required_flow_rate * 1.2

    return {
        'required_minimum': required_flow_rate,
        'recommended': recommended_flow_rate,
        'critical_velocity': critical_velocity,
        'cuttings_volume': rock_volume,
        'target_concentration': target_concentration
    }


def calculate_equivalent_circulating_density_with_cuttings(mud_weight, tvd,
                                                           annular_pressure_loss,
                                                           cuttings_concentration):
    """
    Calculate ECD including cuttings effect

    Args:
        mud_weight: mud weight (kg/l)
        tvd: true vertical depth (m)
        annular_pressure_loss: pressure loss (bar)
        cuttings_concentration: cuttings concentration (%)

    Returns:
        float: ECD (kg/l)
    """
    # Pressure loss component
    pressure_gradient = annular_pressure_loss / tvd if tvd > 0 else 0
    ecd_pressure = mud_weight + (pressure_gradient / 0.0981)

    # Cuttings effect (increases effective density)
    cuttings_factor = 1 + (cuttings_concentration / 100) * 0.5
    ecd_total = ecd_pressure * cuttings_factor

    return ecd_total


def optimize_hole_cleaning_parameters(hole_diameter, pipe_od, rop_target,
                                     bit_diameter, cuttings_density, mud_weight,
                                     mud_viscosity, inclination, pump_capacity):
    """
    Optimize drilling parameters for hole cleaning

    Args:
        hole_diameter: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)
        rop_target: target ROP (m/hr)
        bit_diameter: bit diameter (mm)
        cuttings_density: cuttings density (g/cm³)
        mud_weight: mud weight (kg/l)
        mud_viscosity: mud viscosity (cP)
        inclination: wellbore inclination (degrees)
        pump_capacity: maximum pump capacity (l/min)

    Returns:
        dict: optimization recommendations
    """
    # Calculate required flow rate
    flow_requirements = calculate_flow_rate_for_hole_cleaning(
        hole_diameter, pipe_od, rop_target, bit_diameter,
        cuttings_density, mud_weight, mud_viscosity, inclination
    )

    required_flow = flow_requirements['recommended']

    recommendations = {
        'rop_target': rop_target,
        'flow_rate_required': required_flow,
        'pump_capacity': pump_capacity,
        'status': 'unknown'
    }

    if required_flow <= pump_capacity:
        recommendations['status'] = 'feasible'
        recommendations['flow_rate'] = required_flow
        recommendations['rop_achievable'] = rop_target
        recommendations['message'] = 'Target ROP is achievable with current pump capacity'
    else:
        # Need to reduce ROP
        reduction_factor = pump_capacity / required_flow
        achievable_rop = rop_target * reduction_factor

        recommendations['status'] = 'limited'
        recommendations['flow_rate'] = pump_capacity
        recommendations['rop_achievable'] = achievable_rop
        recommendations['message'] = f'Reduce ROP to {achievable_rop:.1f} m/hr for adequate hole cleaning'

        # Alternative: increase mud properties
        recommendations['alternatives'] = [
            'Increase mud viscosity',
            'Add sweep pills',
            'Consider larger pump',
            'Optimize pipe/hole size ratio'
        ]

    return recommendations


def calculate_sweep_pill_volume(hole_diameter, pipe_od, section_length, excess_factor=1.5):
    """
    Calculate sweep pill volume for hole cleaning

    Args:
        hole_diameter: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)
        section_length: section length to clean (m)
        excess_factor: excess factor (default 1.5)

    Returns:
        dict: sweep pill requirements
    """
    # Convert to metric
    dh = hole_diameter * 0.0254  # m
    dp = pipe_od * 0.0254  # m

    # Annular volume
    annular_area = (math.pi / 4) * (dh**2 - dp**2)  # m²
    annular_volume = annular_area * section_length  # m³

    # Pill volume (with excess)
    pill_volume = annular_volume * excess_factor

    # Convert to barrels and m³
    pill_volume_bbl = pill_volume * 6.2898  # barrels

    return {
        'volume_m3': pill_volume,
        'volume_bbl': pill_volume_bbl,
        'volume_liters': pill_volume * 1000,
        'section_length': section_length,
        'excess_factor': excess_factor,
        'recommendation': 'Pump high-viscosity pill for cuttings removal'
    }
