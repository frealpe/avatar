import anny
import trimesh
import sys

def main():
    print("Initializing Anny model...")
    model = anny.create_fullbody_model()

    # Phenotype for Male (-1.0, 0.5)
    print("Generating Male model...")
    male_result = model.forward(phenotype_kwargs={'gender': -1.0, 'age': 0.5})
    male_vertices = male_result['vertices'][0].detach().cpu().numpy()
    faces = model.faces.detach().cpu().numpy()

    male_mesh = trimesh.Trimesh(vertices=male_vertices, faces=faces)
    male_mesh.export('anny_hombre.obj')
    print("Exported anny_hombre.obj")

    # Phenotype for Female (1.0, 0.5)
    print("Generating Female model...")
    female_result = model.forward(phenotype_kwargs={'gender': 1.0, 'age': 0.5})
    female_vertices = female_result['vertices'][0].detach().cpu().numpy()

    female_mesh = trimesh.Trimesh(vertices=female_vertices, faces=faces)
    female_mesh.export('anny_mujer.obj')
    print("Exported anny_mujer.obj")

    print("Done!")

if __name__ == "__main__":
    main()
