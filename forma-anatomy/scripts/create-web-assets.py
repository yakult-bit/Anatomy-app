"""Rasterise Forma's existing F mark and compose its supplied in-app capture.
No stock or generated anatomical illustration; the captured model is unaltered.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
public = root / 'public'
source = public / 'media/lab-skull.png'
shot = Image.open(source).convert('RGB')
background = shot.getpixel((10, 10))
card = Image.new('RGB', (1200, 630), background)
card.paste(shot, (723, 37))
draw = ImageDraw.Draw(card)
font = lambda size: ImageFont.truetype('DejaVuSans.ttf', size)
draw.text((62, 108), 'forma', font=font(104), fill='#e4e9e1')
draw.text((365, 108), '.', font=font(104), fill='#b7d39f')
draw.text((67, 262), 'Your anatomy lab.', font=font(43), fill='#e4e9e1')
draw.text((68, 346), 'Explore. Recall. Understand.', font=font(24), fill='#b9c8bb')
draw.text((68, 552), 'FREE ANATOMY STUDY FOR NURSING', font=font(17), fill='#b9c8bb')
draw.text((723, 602), 'Z-Anatomy geometry · CC BY-SA', font=font(12), fill='#b9c8bb')
card.save(public / 'social-preview.png', optimize=True)

# Same F-and-dot paths as the existing favicon.svg, drawn at 4x for crisp edges.
icon = Image.new('RGB', (2048, 2048), '#d8f3c4')
d = ImageDraw.Draw(icon)
scale = 2048 / 40
points = [(13,28),(13,12),(28,12)]
d.line([(round(x*scale),round(y*scale)) for x,y in points],fill='#20362c',width=round(4*scale),joint='curve')
d.line([(13*scale,20*scale),(24*scale,20*scale)],fill='#20362c',width=round(4*scale))
for x,y in [(13,28),(28,12),(24,20)]:d.ellipse([(x-2)*scale,(y-2)*scale,(x+2)*scale,(y+2)*scale],fill='#20362c')
d.ellipse([25*scale,25*scale,31*scale,31*scale],fill='#20362c')
for size,name in [(16,'favicon-16x16.png'),(32,'favicon-32x32.png'),(180,'apple-touch-icon.png'),(192,'icon-192.png'),(512,'icon-512.png')]:
 icon.resize((size,size),Image.Resampling.LANCZOS).save(public/name,optimize=True)
icon.resize((256,256),Image.Resampling.LANCZOS).save(public/'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
(public/'site.webmanifest').write_text(json.dumps({'name':'Forma — Anatomy for Nursing','short_name':'Forma','description':'Free anatomy study and practice for nursing students.','start_url':'/','scope':'/','display':'standalone','background_color':'#20292b','theme_color':'#20292b','icons':[{'src':f'/icon-{size}.png','sizes':f'{size}x{size}','type':'image/png','purpose':'any'} for size in [192,512]]},indent=2)+'\n')
print('Created 1200×630 in-app social capture, five icon sizes, ICO and manifest.')
