# Cuts the round SOLIDWORKS badge out of a certificate rendered to PNG (pdftoppm -r 300),
# with a transparent background. Usage: python3 scripts/extract-cert-badge.py page.png out.png
# Then convert to WebP into public/certifications/<slug>.webp (sharp, quality 85).
import sys, numpy as np
from PIL import Image
src, out = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
H, W, _ = im.shape
# badge region roughly: right side of the certificate
y0, y1, x0, x1 = int(H*.36), int(H*.74), int(W*.72), int(W*.97)
reg = im[y0:y1, x0:x1]
R, G, B = reg[...,0], reg[...,1], reg[...,2]
blue = (R < 90) & (B > 90) & (B - R > 60)
ys, xs = np.nonzero(blue)
cy, cx = (ys.min()+ys.max())/2, (xs.min()+xs.max())/2
rout = max(ys.max()-ys.min(), xs.max()-xs.min())/2
# inner radius: walk from centre to the left along the centre row until the ring starts
row = blue[int(cy)]
x = int(cx)
# skip the logo area: walk down instead (bottom is red band then ring)
col = blue[:, int(cx)]
yy = np.nonzero(col[int(cy):])[0]
rin = rout * 297 / 324  # same geometry on every certificate; the centre column can hit blue text
yy_idx, xx_idx = np.mgrid[0:reg.shape[0], 0:reg.shape[1]]
d = np.hypot(yy_idx-cy, xx_idx-cx)
# ring alpha from how dark/blue the pixel is; inside inner disc fully opaque
ring_a = np.clip((235 - R) / (235 - 60), 0, 1)
alpha = np.where(d <= rin + 1, 1.0, np.where(d <= rout + 2, ring_a, 0))
# soft edge on inner disc boundary
rgba = np.dstack([reg, alpha*255]).astype(np.uint8)
pad = 4
cy0, cy1 = int(cy-rout-pad), int(cy+rout+pad)
cx0, cx1 = int(cx-rout-pad), int(cx+rout+pad)
img = Image.fromarray(rgba[cy0:cy1, cx0:cx1], 'RGBA')
img = img.resize((256, 256), Image.LANCZOS)
img.save(out)
print(out, 'centre', round(cx), round(cy), 'rout', round(rout), 'rin', rin)
