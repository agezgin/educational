"""
ROP Prediction Models
Advanced rate of penetration models for drilling optimization
"""

import numpy as np
import math


def bourgoyne_young_rop(depth, formation_strength, wob, rpm, mud_weight,
                       bit_diameter, flow_rate, bit_wear=0, a_coefficients=None):
    """
    Bourgoyne & Young ROP model (8 parameter model)

    Args:
        depth: depth (m)
        formation_strength: formation compressive strength (MPa)
        wob: weight on bit (kN)
        rpm: rotary speed (RPM)
        mud_weight: mud weight (kg/l)
        bit_diameter: bit diameter (mm)
        flow_rate: flow rate (l/min)
        bit_wear: bit wear (0-1, default 0)
        a_coefficients: model coefficients (optional, uses defaults if None)

    Returns:
        float: ROP (m/hr)
    """
    if a_coefficients is None:
        # Default coefficients (need calibration for specific conditions)
        a_coefficients = [5.0, 0.0001, 0.0001, 0.5, 0.5, 0.5, 0.5, 1.0]

    a1, a2, a3, a4, a5, a6, a7, a8 = a_coefficients

    # Formation strength effect
    f1 = np.exp(a1)

    # Depth effect (compaction)
    f2 = np.exp(-a2 * depth)

    # Overbalance effect (differential pressure)
    # Assume normal pore pressure gradient
    pore_pressure_gradient = 0.1  # bar/m
    pore_pressure = pore_pressure_gradient * depth
    bottomhole_pressure = mud_weight * 0.0981 * depth
    differential_pressure = bottomhole_pressure - pore_pressure

    f3 = np.exp(-a3 * differential_pressure)

    # Weight on bit effect
    wob_normalized = wob / bit_diameter  # Normalize by bit diameter
    f4 = (wob_normalized) ** a4

    # Rotary speed effect
    f5 = (rpm) ** a5

    # Hydraulics effect (tooth cleaning)
    hydraulic_power = (flow_rate * 60 / 1000) * 10  # Simplified
    f6 = (hydraulic_power) ** a6

    # Formation strength effect
    f7 = (formation_strength) ** (-a7)

    # Bit wear effect
    f8 = np.exp(-a8 * bit_wear)

    # ROP calculation
    rop = f1 * f2 * f3 * f4 * f5 * f6 * f7 * f8

    return max(0, rop)


def warren_rop_model(wob, rpm, bit_diameter, formation_drillability):
    """
    Warren ROP model (simplified)

    Args:
        wob: weight on bit (kN)
        rpm: rotary speed (RPM)
        bit_diameter: bit diameter (mm)
        formation_drillability: drillability coefficient

    Returns:
        float: ROP (m/hr)
    """
    # Warren's model: ROP = K * (WOB/D)^a * RPM^b
    # where K is formation drillability, D is bit diameter

    k = formation_drillability
    wob_per_diameter = wob / bit_diameter

    # Typical exponents
    a = 0.7
    b = 0.5

    rop = k * (wob_per_diameter ** a) * (rpm ** b)

    return max(0, rop)


def maurer_rop_model(wob, rpm, bit_diameter, rock_strength, threshold_wob):
    """
    Maurer's specific energy model

    Args:
        wob: weight on bit (kN)
        rpm: rotary speed (RPM)
        bit_diameter: bit diameter (mm)
        rock_strength: rock confined compressive strength (MPa)
        threshold_wob: threshold WOB for drilling (kN)

    Returns:
        float: ROP (m/hr)
    """
    if wob <= threshold_wob:
        return 0.0

    effective_wob = wob - threshold_wob

    # Bit area
    bit_area = math.pi * (bit_diameter / 1000 / 2) ** 2  # m²

    # Specific energy
    # ES = rock_strength / efficiency
    efficiency = 0.35  # Typical mechanical efficiency
    es = rock_strength / efficiency

    # Volume removal rate
    # V = (WOB * RPM) / (ES * A)
    volume_rate = (effective_wob * rpm) / (es * bit_area)

    # ROP = V / A
    rop = volume_rate / bit_area * 60  # Convert to m/hr

    return max(0, rop)


def optimize_wob_rpm(formation_strength, bit_diameter, flow_rate,
                     wob_range=(50, 200), rpm_range=(60, 180), steps=20):
    """
    Optimize WOB and RPM for maximum ROP

    Args:
        formation_strength: formation strength (MPa)
        bit_diameter: bit diameter (mm)
        flow_rate: flow rate (l/min)
        wob_range: WOB range to test (kN)
        rpm_range: RPM range to test
        steps: number of steps for optimization

    Returns:
        tuple: (optimal_wob, optimal_rpm, max_rop)
    """
    wob_values = np.linspace(wob_range[0], wob_range[1], steps)
    rpm_values = np.linspace(rpm_range[0], rpm_range[1], steps)

    max_rop = 0
    optimal_wob = wob_range[0]
    optimal_rpm = rpm_range[0]

    for wob in wob_values:
        for rpm in rpm_values:
            # Use Bourgoyne-Young model for prediction
            rop = bourgoyne_young_rop(
                depth=1000,  # Example depth
                formation_strength=formation_strength,
                wob=wob,
                rpm=rpm,
                mud_weight=1.2,
                bit_diameter=bit_diameter,
                flow_rate=flow_rate
            )

            if rop > max_rop:
                max_rop = rop
                optimal_wob = wob
                optimal_rpm = rpm

    return optimal_wob, optimal_rpm, max_rop


def calculate_mechanical_specific_energy(wob, rpm, torque, rop, bit_diameter):
    """
    Calculate Mechanical Specific Energy (MSE)

    Args:
        wob: weight on bit (kN)
        rpm: rotary speed (RPM)
        torque: torque (kN.m)
        rop: rate of penetration (m/hr)
        bit_diameter: bit diameter (mm)

    Returns:
        float: MSE (MPa)
    """
    if rop <= 0:
        return float('inf')

    # Bit area
    bit_area = math.pi * (bit_diameter / 1000 / 2) ** 2  # m²

    # Convert ROP to m/s
    rop_ms = rop / 3600

    # MSE = (WOB / A) + (120 * π * RPM * T) / (A * ROP)
    # where T is torque, A is bit area

    axial_component = (wob * 1000) / bit_area  # Convert kN to N

    rotary_component = (120 * math.pi * rpm * torque * 1000) / (bit_area * rop_ms)

    mse = (axial_component + rotary_component) / 1e6  # Convert to MPa

    return mse


def detect_drilling_inefficiency(mse, rock_strength):
    """
    Detect drilling inefficiency using MSE

    Args:
        mse: mechanical specific energy (MPa)
        rock_strength: rock confined compressive strength (MPa)

    Returns:
        dict: inefficiency analysis
    """
    # Ideal MSE should be close to rock strength
    efficiency = rock_strength / mse if mse > 0 else 0

    analysis = {
        'efficiency': efficiency,
        'mse': mse,
        'rock_strength': rock_strength,
        'status': 'unknown'
    }

    if efficiency > 0.8:
        analysis['status'] = 'efficient'
        analysis['recommendation'] = 'Drilling parameters are optimal'
    elif efficiency > 0.5:
        analysis['status'] = 'moderate'
        analysis['recommendation'] = 'Consider optimizing WOB and RPM'
    else:
        analysis['status'] = 'inefficient'
        analysis['recommendation'] = 'Check for bit wear, vibration, or hole cleaning issues'

    return analysis


def calculate_cost_per_meter(rig_cost_per_day, rop_avg, bit_cost, bit_life_meters, trip_time_hours):
    """
    Calculate drilling cost per meter

    Args:
        rig_cost_per_day: rig operating cost ($/day)
        rop_avg: average ROP (m/hr)
        bit_cost: bit cost ($)
        bit_life_meters: expected bit life (m)
        trip_time_hours: round trip time (hours)

    Returns:
        float: cost per meter ($/m)
    """
    # Rig cost per hour
    rig_cost_per_hour = rig_cost_per_day / 24

    # Drilling time per meter
    time_per_meter = 1 / rop_avg if rop_avg > 0 else float('inf')

    # Rig cost per meter
    rig_cost_per_meter = rig_cost_per_hour * time_per_meter

    # Bit cost per meter
    bit_cost_per_meter = bit_cost / bit_life_meters if bit_life_meters > 0 else 0

    # Trip cost per meter
    trip_cost = rig_cost_per_hour * trip_time_hours
    trip_cost_per_meter = trip_cost / bit_life_meters if bit_life_meters > 0 else 0

    # Total cost per meter
    total_cost = rig_cost_per_meter + bit_cost_per_meter + trip_cost_per_meter

    return total_cost


def optimize_bit_run_length(rig_cost_per_day, rop_initial, rop_decay_rate,
                           bit_cost, trip_time_hours, max_meters=1000):
    """
    Optimize bit run length for minimum cost

    Args:
        rig_cost_per_day: rig cost ($/day)
        rop_initial: initial ROP (m/hr)
        rop_decay_rate: ROP decay rate (% per 100m)
        bit_cost: bit cost ($)
        trip_time_hours: trip time (hours)
        max_meters: maximum meters to consider

    Returns:
        dict: optimization results
    """
    distances = np.linspace(100, max_meters, 20)
    costs = []

    for distance in distances:
        # Calculate average ROP with decay
        avg_rop = rop_initial * (1 - rop_decay_rate * distance / 200)
        avg_rop = max(1, avg_rop)  # Minimum 1 m/hr

        cost = calculate_cost_per_meter(
            rig_cost_per_day, avg_rop, bit_cost, distance, trip_time_hours
        )

        costs.append(cost)

    # Find minimum cost
    min_cost_idx = np.argmin(costs)
    optimal_distance = distances[min_cost_idx]
    min_cost = costs[min_cost_idx]

    return {
        'optimal_bit_run': optimal_distance,
        'minimum_cost_per_meter': min_cost,
        'distances': distances.tolist(),
        'costs': costs
    }
