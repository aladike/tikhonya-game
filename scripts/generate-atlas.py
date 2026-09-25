"""Original 16px tiles, generated from the project's palette. No external assets."""
from pathlib import Path
import random,struct,zlib
random.seed(731)
colors=['BDE8FF','B87A4B','6BD34A','B87A4B','F6DB8C','9AA3B5','8593AB','9C6B3F','E0A96D','E0A96D','3FBF5A','B0E7F6','3CC8E8','F2F6FF','E98B76','FF7A91','47C7A5','FFD23F','FFC76B','B983FF','FF5D8F','FFD23F','B983FF','FFFFFF','FFB8D4','8CE8F0','FFAE60','8CDF62','A3ECFF','FF9CC7','FFB347','E8D4FF']
w,h=128,64
pixels=bytearray(w*h*4)
for tile,hexcolor in enumerate(colors):
 base=tuple(int(hexcolor[i:i+2],16) for i in (0,2,4))
 for y in range(16):
  for x in range(16):
   noise=random.uniform(.92,1.08);rgb=base;alpha=255
   if tile==1 and y<4+(x%3):rgb=(79,174,58)
   if tile==6 and ((x+(8 if y>=8 else 0))%8==0 or y%8==0):noise=.76
   if tile in (7,9) and (x%5==0 if tile==7 else y%5==0):noise=.78
   if tile==8 and max(abs(x-7.5),abs(y-7.5))%3<1:noise=.82
   if tile in (10,29) and (x*3+y*7)%13<2:alpha=0
   if tile==11:alpha=75 if 1<x<14 and 1<y<14 else 210
   if tile==12:alpha=145;noise+=.08 if (x+y)%8==0 else 0
   if tile==14 and (y%5==0 or (x+(4 if y//5%2 else 0))%8==0):rgb=(244,209,177)
   if tile in (15,16,17):noise+=.04 if (x+y)%2 else -.04
   if tile==18 and (x in (0,1,14,15) or y in (0,1,14,15)):rgb=(136,97,62)
   if tile==18 and ((x in (5,10) and y in (5,6)) or (y==10 and 5<=x<=10)):rgb=(114,78,63)
   if tile==19 and (x<2 or x>13 or y<2 or y>13):rgb=(255,215,99)
   if 20<=tile<=23:
    alpha=0
    if (x-7)**2+(y-5)**2<18 or (abs(x-7)<2 and y>6):alpha=255
    if y>8:rgb=(64,164,74)
    if abs(x-7)<2 and abs(y-5)<2:rgb=(255,210,63)
   if tile==24 and (x-8)**2+(y-8)**2<35:rgb=(255,237,204);noise=.8 if (x+y)%4==0 else 1
   if tile==25:alpha=185;noise=1.15 if (x-8)**2+(y-8)**2 in range(30,44) else noise
   if tile==26 and (x*7+y*11)%19<3:rgb=random.choice([(255,122,145),(71,199,165),(185,131,255)])
   if tile==27 and ((x-5)**2+(y-6)**2<8 or (x-10)**2+(y-6)**2<8 or (x-8)**2+(y-10)**2<8):rgb=(45,142,73)
   if tile==28 and (abs(x-7)+abs(y-7)<4 or x==7 or y==7):rgb=(255,251,181)
   i=(((tile//8)*16+y)*w+(tile%8)*16+x)*4
   pixels[i:i+4]=bytes([max(0,min(255,int(v*noise))) for v in rgb]+[alpha])
raw=b''.join(b'\0'+pixels[y*w*4:(y+1)*w*4] for y in range(h))
def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
Path('public/atlas.png').write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(raw,9))+chunk(b'IEND',b''))
