#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET

with zipfile.ZipFile('/Users/kartiksetia/Desktop/Leeado Backend.docx') as archive:
    root = ET.fromstring(archive.read('word/document.xml'))
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
paragraph = root.findall('.//w:p', ns)[1]
print(''.join(node.text or '' for node in paragraph.findall('.//w:t', ns)).strip())
