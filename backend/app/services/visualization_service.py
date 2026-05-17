import numpy as np
import plotly.graph_objects as go
import nilearn.datasets
from nilearn.surface import load_surf_mesh, load_surf_data
import os
import logging

logger = logging.getLogger(__name__)

def generate_3d_brain_html(roi_probs: list[float]) -> str:
    """
    Generate an interactive 3D HTML visualization of the brain with seizure
    probabilities overlaid using an atlas for centroids.
    """
    logger.info("Fetching fsaverage5 brain template and Destrieux atlas...")
    # Use fsaverage5 so it perfectly aligns with the Destrieux surface atlas
    fsaverage = nilearn.datasets.fetch_surf_fsaverage(mesh='fsaverage5')
    destrieux = nilearn.datasets.fetch_atlas_surf_destrieux()
    
    logger.info("Loading mesh geometry and atlas labels...")
    coords_l, faces_l = load_surf_mesh(fsaverage['pial_left'])
    coords_r, faces_r = load_surf_mesh(fsaverage['pial_right'])
    
    labels_l = load_surf_data(destrieux['map_left'])
    labels_r = load_surf_data(destrieux['map_right'])
    
    # Combine both hemispheres into one large mesh
    faces_r_offset = faces_r + len(coords_l)
    coords = np.vstack((coords_l, coords_r))
    faces = np.vstack((faces_l, faces_r_offset))
    
    # Extract centroids from the atlas
    centroids = []
    ul_l = np.unique(labels_l[labels_l > 0])
    for lbl in ul_l:
        centroids.append(coords_l[labels_l == lbl].mean(axis=0))
        
    ul_r = np.unique(labels_r[labels_r > 0])
    for lbl in ul_r:
        # Need to shift to the right hemisphere coordinates
        centroids.append(coords_r[labels_r == lbl].mean(axis=0))
        
    centroids = np.array(centroids)
    
    # We will compute intensity over all vertices
    intensity = np.zeros(len(coords))
    
    # Spread the roi_probs over the mesh using the centroids
    # If roi_probs is longer than available centroids, we cap it.
    n_rois = min(len(roi_probs), len(centroids))
    
    logger.info(f"Applying Gaussian spread for {n_rois} ROIs...")
    spread = 15.0  # the "hologram" glow spread parameter
    for i in range(n_rois):
        prob = roi_probs[i]
        if prob <= 0:
            continue
        c = centroids[i]
        distances = np.linalg.norm(coords - c, axis=1)
        # Add probability-weighted gaussian distance
        intensity += prob * np.exp(- (distances**2) / (2 * spread**2))
    
    intensity = np.clip(intensity, 0, 1)
    
    x, y, z = coords.T
    i_faces, j_faces, k_faces = faces.T
    
    # Custom hologram colorscale (Ice Blue -> Cyan -> Orange -> Red)
    hologram_colorscale = [
        [0.0, '#e6f2ff'], # Very light ice blue for healthy tissue
        [0.3, '#66ccff'], # Bright cyan
        [0.6, '#ffcc00'], # Yellow/Orange
        [1.0, '#ff0000']  # Hot Red for Seizure Onset Zone
    ]
    
    mesh_trace = go.Mesh3d(
        x=x, y=y, z=z,
        i=i_faces, j=j_faces, k=k_faces,
        intensity=intensity,
        colorscale=hologram_colorscale,
        cmin=0, cmax=1.0,
        opacity=0.35, # Semi-transparent for hologram effect
        name='Seizure Onset Zone',
        showscale=True,
        colorbar=dict(title="Seizure Probability", x=0.85, thickness=15),
        lighting=dict(ambient=0.5, diffuse=0.8, specular=0.4, roughness=0.2, fresnel=0.3),
        lightposition=dict(x=100, y=100, z=50)
    )
    
    prob_text = f"Global Peak Seizure Probability: {np.max(intensity)*100:.1f}%"
    
    fig = go.Figure(
        data=[mesh_trace],
        layout=go.Layout(
            title=f"<b>3D Seizure Onset Zone</b><br><span style='font-size:14px; color:#555555'>{prob_text}</span>",
            scene=dict(
                xaxis=dict(visible=False),
                yaxis=dict(visible=False),
                zaxis=dict(visible=False),
                aspectmode='data',
                camera=dict(
                    eye=dict(x=1.5, y=-1.5, z=0.5)
                )
            ),
            paper_bgcolor='white',
            font=dict(color='black'),
            margin=dict(l=0, r=0, b=0, t=60)
        )
    )
    
    logger.info("Generating HTML string...")
    # Return raw HTML
    return fig.to_html(full_html=True, include_plotlyjs='cdn')
