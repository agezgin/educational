"""
Advanced Calculation Utilities - Part 2
Advanced mathematical models for drilling hydraulics, torque & drag, and geomechanics
"""

import numpy as np
import math


# ============================================================================
# DRILLING HYDRAULICS - Advanced Models
# ============================================================================

def calculate_plastic_viscosity(theta_600, theta_300):
    """
    Calculate plastic viscosity from Fann viscometer readings

    Args:
        theta_600: 600 RPM reading
        theta_300: 300 RPM reading

    Returns:
        float: Plastic viscosity (cP)
    """
    return theta_600 - theta_300


def calculate_yield_point(theta_600, theta_300):
    """
    Calculate yield point from Fann viscometer readings

    Args:
        theta_600: 600 RPM reading
        theta_300: 300 RPM reading

    Returns:
        float: Yield point (lb/100ft²)
    """
    return theta_300 - (theta_600 - theta_300)


def calculate_reynolds_number_bingham(mud_weight, velocity, diameter, plastic_viscosity, yield_point):
    """
    Calculate Reynolds number for Bingham Plastic model

    Args:
        mud_weight: mud weight (kg/l)
        velocity: flow velocity (m/s)
        diameter: pipe/annulus diameter (m)
        plastic_viscosity: plastic viscosity (cP)
        yield_point: yield point (lb/100ft²)

    Returns:
        float: Reynolds number
    """
    # Convert units
    density = mud_weight * 1000  # kg/m³
    pv = plastic_viscosity / 1000  # Pa.s
    yp = yield_point * 0.4788  # Pa

    # Reynolds number for Bingham Plastic
    nre = (density * velocity * diameter) / pv

    return nre


def calculate_annular_pressure_loss_bingham(flow_rate, hole_dia, pipe_od, length,
                                           mud_weight, plastic_viscosity, yield_point):
    """
    Calculate annular pressure loss using Bingham Plastic model

    Args:
        flow_rate: flow rate (l/min)
        hole_dia: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)
        length: length (m)
        mud_weight: mud weight (kg/l)
        plastic_viscosity: plastic viscosity (cP)
        yield_point: yield point (lb/100ft²)

    Returns:
        float: pressure loss (bar)
    """
    # Convert units
    q = flow_rate / 60000  # m³/s
    dh = hole_dia * 0.0254  # m
    dp = pipe_od * 0.0254  # m

    # Annular dimensions
    annular_area = (math.pi / 4) * (dh**2 - dp**2)
    annular_velocity = q / annular_area
    hydraulic_diameter = dh - dp

    # Calculate Reynolds number
    nre = calculate_reynolds_number_bingham(mud_weight, annular_velocity,
                                           hydraulic_diameter, plastic_viscosity, yield_point)

    # Friction factor (simplified)
    if nre < 2100:  # Laminar flow
        f = 16 / nre
    else:  # Turbulent flow
        f = 0.046 / (nre**0.2)

    # Pressure loss (Darcy-Weisbach equation)
    density = mud_weight * 1000  # kg/m³
    pressure_loss_pa = f * (length / hydraulic_diameter) * (density * annular_velocity**2) / 2

    # Convert to bar
    pressure_loss_bar = pressure_loss_pa / 100000

    return pressure_loss_bar


def calculate_pipe_pressure_loss(flow_rate, pipe_id, length, mud_weight,
                                 plastic_viscosity, yield_point):
    """
    Calculate pressure loss inside drill pipe

    Args:
        flow_rate: flow rate (l/min)
        pipe_id: pipe inner diameter (inches)
        length: length (m)
        mud_weight: mud weight (kg/l)
        plastic_viscosity: plastic viscosity (cP)
        yield_point: yield point (lb/100ft²)

    Returns:
        float: pressure loss (bar)
    """
    # Convert units
    q = flow_rate / 60000  # m³/s
    d = pipe_id * 0.0254  # m

    # Pipe flow
    area = (math.pi / 4) * d**2
    velocity = q / area

    # Calculate Reynolds number
    nre = calculate_reynolds_number_bingham(mud_weight, velocity, d,
                                           plastic_viscosity, yield_point)

    # Friction factor
    if nre < 2100:  # Laminar flow
        f = 16 / nre
    else:  # Turbulent flow
        f = 0.046 / (nre**0.2)

    # Pressure loss
    density = mud_weight * 1000  # kg/m³
    pressure_loss_pa = f * (length / d) * (density * velocity**2) / 2

    # Convert to bar
    pressure_loss_bar = pressure_loss_pa / 100000

    return pressure_loss_bar


def calculate_surge_pressure(mud_weight, tvd, pipe_velocity, hole_dia, pipe_od):
    """
    Calculate surge pressure during tripping in

    Args:
        mud_weight: mud weight (kg/l)
        tvd: true vertical depth (m)
        pipe_velocity: pipe velocity (m/s)
        hole_dia: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)

    Returns:
        float: surge pressure (bar)
    """
    # Static pressure
    static_pressure = mud_weight * tvd * 0.0981

    # Dynamic pressure (simplified)
    dh = hole_dia * 0.0254
    dp = pipe_od * 0.0254
    annular_area = (math.pi / 4) * (dh**2 - dp**2)

    # Surge factor (simplified)
    surge_factor = 1 + (pipe_velocity * 0.1)  # Simplified calculation

    surge_pressure = static_pressure * surge_factor

    return surge_pressure


def calculate_swab_pressure(mud_weight, tvd, pipe_velocity, hole_dia, pipe_od):
    """
    Calculate swab pressure during tripping out

    Args:
        mud_weight: mud weight (kg/l)
        tvd: true vertical depth (m)
        pipe_velocity: pipe velocity (m/s)
        hole_dia: hole diameter (inches)
        pipe_od: pipe outer diameter (inches)

    Returns:
        float: swab pressure (bar)
    """
    # Static pressure
    static_pressure = mud_weight * tvd * 0.0981

    # Swab factor (simplified)
    swab_factor = 1 - (pipe_velocity * 0.1)  # Simplified calculation

    swab_pressure = static_pressure * swab_factor

    return swab_pressure


# ============================================================================
# GEOMECHANICS - Advanced Models
# ============================================================================

def calculate_pore_pressure_eaton(overburden, normal_pressure, obs_velocity, normal_velocity, eaton_exponent=3.0):
    """
    Calculate pore pressure using Eaton's method

    Args:
        overburden: overburden stress (bar)
        normal_pressure: normal pore pressure (bar)
        obs_velocity: observed sonic velocity (m/s)
        normal_velocity: normal trend velocity (m/s)
        eaton_exponent: Eaton exponent (default 3.0)

    Returns:
        float: pore pressure (bar)
    """
    if normal_velocity <= 0 or obs_velocity <= 0:
        return normal_pressure

    ratio = obs_velocity / normal_velocity

    pore_pressure = overburden - (overburden - normal_pressure) * (ratio ** eaton_exponent)

    return pore_pressure


def calculate_fracture_gradient_matthews_kelly(overburden_gradient, pore_pressure_gradient,
                                               poisson_ratio, depth):
    """
    Calculate fracture gradient using Matthews & Kelly method

    Args:
        overburden_gradient: overburden gradient (bar/m)
        pore_pressure_gradient: pore pressure gradient (bar/m)
        poisson_ratio: Poisson's ratio
        depth: depth (m)

    Returns:
        float: fracture gradient (bar/m)
    """
    # Matthews & Kelly equation
    ki = (poisson_ratio / (1 - poisson_ratio))

    fracture_gradient = (ki * (overburden_gradient - pore_pressure_gradient)) + pore_pressure_gradient

    return fracture_gradient


def calculate_mohr_coulomb_failure(sigma1, sigma3, ucs, friction_angle):
    """
    Calculate shear failure using Mohr-Coulomb criterion

    Args:
        sigma1: maximum principal stress (MPa)
        sigma3: minimum principal stress (MPa)
        ucs: unconfined compressive strength (MPa)
        friction_angle: internal friction angle (degrees)

    Returns:
        float: safety factor
    """
    phi = math.radians(friction_angle)

    # Cohesion from UCS
    cohesion = ucs / (2 * math.tan(math.pi/4 + phi/2))

    # Mohr-Coulomb failure criterion
    shear_strength = cohesion * math.cos(phi) + sigma3 * math.sin(phi)
    applied_shear = (sigma1 - sigma3) / 2

    safety_factor = shear_strength / applied_shear if applied_shear > 0 else float('inf')

    return safety_factor


def calculate_wellbore_breakout_width(sigma_h_min, sigma_h_max, pore_pressure,
                                      mud_weight, tvd, ucs, friction_angle):
    """
    Calculate wellbore breakout width

    Args:
        sigma_h_min: minimum horizontal stress (MPa)
        sigma_h_max: maximum horizontal stress (MPa)
        pore_pressure: pore pressure (MPa)
        mud_weight: mud weight (kg/l)
        tvd: true vertical depth (m)
        ucs: unconfined compressive strength (MPa)
        friction_angle: internal friction angle (degrees)

    Returns:
        float: breakout width (degrees)
    """
    # Wellbore pressure
    pw = mud_weight * tvd * 0.0981 / 10  # Convert to MPa

    # Hoop stress at borehole wall
    sigma_theta = 3 * sigma_h_min - sigma_h_max - pw - pore_pressure

    # Compressive strength required
    sigma_c_required = sigma_theta

    # Breakout criterion
    if sigma_c_required > ucs:
        # Calculate breakout angle (simplified)
        breakout_width = 2 * math.degrees(math.acos(ucs / sigma_c_required))
    else:
        breakout_width = 0

    return breakout_width


def calculate_biot_coefficient(bulk_modulus_frame, bulk_modulus_solid):
    """
    Calculate Biot coefficient for poroelasticity

    Args:
        bulk_modulus_frame: bulk modulus of rock frame (GPa)
        bulk_modulus_solid: bulk modulus of solid grains (GPa)

    Returns:
        float: Biot coefficient (0-1)
    """
    if bulk_modulus_solid <= 0:
        return 1.0

    alpha = 1 - (bulk_modulus_frame / bulk_modulus_solid)

    return max(0, min(1, alpha))


# ============================================================================
# ROCK MECHANICS
# ============================================================================

def calculate_ucs_from_sonic(compressional_velocity, shear_velocity=None):
    """
    Estimate UCS from sonic velocities

    Args:
        compressional_velocity: P-wave velocity (m/s)
        shear_velocity: S-wave velocity (m/s, optional)

    Returns:
        float: UCS (MPa)
    """
    # McNally correlation (simplified)
    vp = compressional_velocity / 1000  # km/s

    ucs = 0.77 * (vp ** 3.5)  # MPa

    return ucs


def calculate_youngs_modulus_from_sonic(density, vp, vs):
    """
    Calculate Young's modulus from sonic velocities

    Args:
        density: bulk density (g/cm³)
        vp: P-wave velocity (m/s)
        vs: S-wave velocity (m/s)

    Returns:
        float: Young's modulus (GPa)
    """
    # Convert density to kg/m³
    rho = density * 1000

    # Lame parameters
    mu = rho * vs**2  # Shear modulus (Pa)
    lambda_param = rho * vp**2 - 2 * mu

    # Young's modulus
    E = mu * (3 * lambda_param + 2 * mu) / (lambda_param + mu)

    # Convert to GPa
    E_gpa = E / 1e9

    return E_gpa


def calculate_poissons_ratio_from_sonic(vp, vs):
    """
    Calculate Poisson's ratio from sonic velocities

    Args:
        vp: P-wave velocity (m/s)
        vs: S-wave velocity (m/s)

    Returns:
        float: Poisson's ratio
    """
    if vs <= 0:
        return 0.25  # Default value

    vp_vs_ratio = vp / vs

    nu = (vp_vs_ratio**2 - 2) / (2 * (vp_vs_ratio**2 - 1))

    return max(0, min(0.5, nu))


# ============================================================================
# TORQUE & DRAG
# ============================================================================

def calculate_drag_force(weight_buoyant, inclination, friction_factor):
    """
    Calculate drag force in wellbore

    Args:
        weight_buoyant: buoyant weight (kN)
        inclination: wellbore inclination (degrees)
        friction_factor: friction factor

    Returns:
        float: drag force (kN)
    """
    inc_rad = math.radians(inclination)

    normal_force = weight_buoyant * math.cos(inc_rad)
    drag_force = friction_factor * normal_force

    return drag_force


def calculate_hook_load(weight_in_air, mud_weight, steel_density=7.85):
    """
    Calculate hook load considering buoyancy

    Args:
        weight_in_air: weight in air (kN)
        mud_weight: mud weight (kg/l)
        steel_density: steel density (g/cm³, default 7.85)

    Returns:
        float: hook load (kN)
    """
    buoyancy_factor = 1 - (mud_weight / steel_density)
    hook_load = weight_in_air * buoyancy_factor

    return hook_load


def calculate_torque(force, radius, friction_factor):
    """
    Calculate torque

    Args:
        force: normal force (kN)
        radius: tool radius (m)
        friction_factor: friction factor

    Returns:
        float: torque (kN.m)
    """
    torque = force * radius * friction_factor

    return torque


# ============================================================================
# PRODUCTION OPTIMIZATION
# ============================================================================

def calculate_productivity_index(oil_rate, reservoir_pressure, bottomhole_pressure):
    """
    Calculate productivity index

    Args:
        oil_rate: oil production rate (m³/day)
        reservoir_pressure: reservoir pressure (bar)
        bottomhole_pressure: bottomhole flowing pressure (bar)

    Returns:
        float: productivity index (m³/day/bar)
    """
    if reservoir_pressure <= bottomhole_pressure:
        return 0.0

    pi = oil_rate / (reservoir_pressure - bottomhole_pressure)

    return pi


def calculate_ipr_vogel(reservoir_pressure, bottomhole_pressure, max_rate):
    """
    Calculate IPR using Vogel's correlation

    Args:
        reservoir_pressure: reservoir pressure (bar)
        bottomhole_pressure: bottomhole pressure (bar)
        max_rate: maximum production rate (m³/day)

    Returns:
        float: production rate (m³/day)
    """
    if reservoir_pressure <= 0:
        return 0.0

    pr_ratio = bottomhole_pressure / reservoir_pressure

    q = max_rate * (1 - 0.2 * pr_ratio - 0.8 * pr_ratio**2)

    return max(0, q)


def calculate_water_cut(oil_rate, water_rate):
    """
    Calculate water cut

    Args:
        oil_rate: oil rate (m³/day)
        water_rate: water rate (m³/day)

    Returns:
        float: water cut (%)
    """
    total_liquid = oil_rate + water_rate

    if total_liquid <= 0:
        return 0.0

    water_cut = (water_rate / total_liquid) * 100

    return water_cut


def calculate_gor(gas_rate, oil_rate):
    """
    Calculate Gas-Oil Ratio

    Args:
        gas_rate: gas rate (m³/day)
        oil_rate: oil rate (m³/day)

    Returns:
        float: GOR (m³/m³)
    """
    if oil_rate <= 0:
        return 0.0

    gor = gas_rate / oil_rate

    return gor
