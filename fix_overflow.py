import re

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'r') as f:
    content = f.read()

content = content.replace('width: 100vw;', 'width: 100%;')

with open('/home/nthdat/2937/public/tools/music-live/public/index.html', 'w') as f:
    f.write(content)

print("Done")
