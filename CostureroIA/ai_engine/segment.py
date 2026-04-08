def segment_clothing(image_path):
    print(f"Segmenting clothing on {image_path}")
    print("Running SAM (Segment Anything Model) to isolate garment...")
    return {"mask_path": "mock_mask.png"}

if __name__ == "__main__":
    import sys
    print(segment_clothing(sys.argv[1] if len(sys.argv) > 1 else "dummy.jpg"))
