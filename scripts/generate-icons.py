"""Original CC0 block-island icon, using only Python's standard library."""
from pathlib import Path
import struct
import zlib

shapes = [
    ('#4FB3FF', [(0, 0), (32, 0), (32, 32), (0, 32)]),
    ('#FFD23F', [(23, 4), (27, 4), (27, 8), (23, 8)]),
    ('#FFFFFF', [(3, 6), (6, 6), (6, 5), (9, 5), (9, 8), (3, 8)]),
    ('#3CC8E8', [(0, 24), (32, 24), (32, 32), (0, 32)]),
    ('#F6DB8C', [(5, 22), (16, 17), (28, 22), (16, 29)]),
    ('#B87A4B', [(5, 22), (16, 27), (16, 29), (5, 24)]),
    ('#6BD34A', [(5, 21), (16, 16), (28, 21), (16, 26)]),
    ('#FF7A59', [(9, 12), (23, 12), (23, 21), (9, 21)]),
    ('#FF9CC7', [(9, 12), (13, 12), (13, 22), (9, 21)]),
    ('#FF9CC7', [(19, 12), (23, 12), (23, 21), (19, 23)]),
    ('#FFD23F', [(8, 10), (10, 10), (10, 12), (12, 12), (12, 10), (14, 10), (14, 14), (8, 14)]),
    ('#FFD23F', [(18, 10), (20, 10), (20, 12), (22, 12), (22, 10), (24, 10), (24, 14), (18, 14)]),
    ('#FFF7E8', [(14, 17), (18, 17), (18, 23), (14, 23)]),
    ('#704445', [(15, 18), (17, 18), (17, 23), (15, 23)]),
    ('#B0E7F6', [(10, 15), (12, 15), (12, 17), (10, 17)]),
    ('#B0E7F6', [(20, 15), (22, 15), (22, 17), (20, 17)]),
    ('#FFF7E8', [(15, 5), (16, 5), (16, 12), (15, 12)]),
    ('#47C7A5', [(16, 5), (21, 5), (19, 7), (16, 7)]),
]

def inside(x, y, points):
    result = False
    for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
        if (ay > y) != (by > y) and x < (bx-ax)*(y-ay)/(by-ay)+ax:
            result = not result
    return result

pixels = []
for y in range(32):
    row = []
    for x in range(32):
        color = '#4FB3FF'
        for fill, points in shapes:
            if inside(x+.5, y+.5, points):
                color = fill
        row.append(bytes.fromhex(color[1:]))
    pixels.append(row)

def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind+data)&0xffffffff)

for size, name in [(512,'icon-512.png'),(192,'icon-192.png'),(180,'apple-touch-icon.png')]:
    raw = b''.join(b'\0' + b''.join(pixels[y*32//size][x*32//size] for x in range(size)) for y in range(size))
    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,2,0,0,0)) + chunk(b'IDAT',zlib.compress(raw,9)) + chunk(b'IEND',b'')
    Path('public',name).write_bytes(png)
paths = ''.join('<polygon fill="'+fill+'" points="'+' '.join(f'{x},{y}' for x,y in points)+'"/>' for fill,points in shapes)
Path('public/icon.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 32 32" shape-rendering="crispEdges">'+paths+'</svg>\n')
