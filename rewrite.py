import re

with open("src/components/PortsScreen.tsx", "r") as f:
    content = f.read()

# I will replace the whole component because the original is very big and cluttered
