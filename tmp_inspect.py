import os
for f in ['index.html','index1.html','index2.html','index222.html','index2223.html','index3333.html']:
    s=open(f,encoding='utf-8',errors='ignore').read()
    idx=s.rfind('<script>')
    m=s.rfind('═════════')
    print(f, 'last script at', idx, 'tail len', len(s)-idx, 'marker at', m)
