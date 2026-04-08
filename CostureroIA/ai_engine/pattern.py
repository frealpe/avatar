def extract_contours(mask_data):
    print("Extracting geometric patterns/contours from mask...")
    return {"vertices": [(0,0), (1,0), (1,1), (0,1)], "edges": [(0,1), (1,2), (2,3), (3,0)]}

if __name__ == "__main__":
    print(extract_contours("mock_mask"))
