import smplx
import torch

model_path = 'models/smplx'
model = smplx.create(model_path, model_type='smplx')
print("Model created.")

# SMPL-X has 55 joints
# We want to see if 16 and 17 are what we think they are.
# However, smplx doesn't directly give names easily without the J_regressor mapping.
# But we can check the number of joints.
print(f"Num joints: {model.J_regressor.shape[0]}")
