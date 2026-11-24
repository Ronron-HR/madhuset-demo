"""Denoise a 2:1 Blender panorama with oidnDenoise and export WebP."""
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

source, output, oidn = sys.argv[1:]
rgb = np.array(Image.open(source).convert("RGB"), dtype=np.float32) / 255
height, width, _ = rgb.shape
assert width == height * 2, "Expected a 2:1 panorama"

with tempfile.TemporaryDirectory() as work:
    work = Path(work)
    # Pad across the horizontal join so filtering also matches at the 360° seam.
    padded = np.pad(rgb, ((0, 0), (32, 32), (0, 0)), mode="wrap")
    start = work / "input.pfm"
    target = work / "clean.pfm"
    with start.open("wb") as f:
        f.write(f"PF\n{padded.shape[1]} {height}\n-1.0\n".encode())
        np.flipud(padded).astype("<f4").tofile(f)
    subprocess.run([oidn, "-d", "cpu", "--threads", "3", "--ldr", str(start),
                    "--srgb", "-q", "high", "-o", str(target)], check=True)
    with target.open("rb") as f:
        assert f.readline().strip() == b"PF"
        w, h = map(int, f.readline().split())
        scale = float(f.readline())
        assert (w, h) == (width + 64, height)
        clean = np.fromfile(f, dtype="<f4" if scale < 0 else ">f4").reshape(h, w, 3)
    clean = np.flipud(clean)[:, 32:-32, :]
    image = Image.fromarray(np.uint8(np.clip(clean, 0, 1) * 255 + .5))
    image.save(output, encoding="webp", quality=89, method=5)
