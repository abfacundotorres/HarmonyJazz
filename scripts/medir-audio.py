# Analiza una captura de scripts/medir-audio.mjs: pico, rms, muestras sobre 0,89 y reparto de energía por bandas.
import json,sys,numpy as np
d=json.load(open(sys.argv[1])); sr=d['sr']; import base64; x=np.frombuffer(base64.b64decode(d['f32']),dtype=np.float32).astype(np.float64)
x=x[int(sr*0.2):]
pk=np.abs(x).max(); rms=np.sqrt((x**2).mean())
db=lambda v:20*np.log10(max(v,1e-9))
print(f"{sys.argv[1].split('/')[-1]}: sr={sr} n={len(x)/sr:.1f}s peak={pk:.3f} ({db(pk):.1f} dBFS) rms={db(rms):.1f} dBFS  >0.89: {100*(np.abs(x)>0.89).mean():.2f}%")
N=1<<15; w=np.hanning(N)
S=np.zeros(N//2+1)
for i in range(0,len(x)-N,N//2): S+=np.abs(np.fft.rfft(x[i:i+N]*w))**2
f=np.fft.rfftfreq(N,1/sr)
bands=[(20,60),(60,120),(120,250),(250,500),(500,1000),(1000,2000),(2000,4000),(4000,8000),(8000,16000)]
tot=S[(f>=20)].sum()
print('  bandas %:', ' '.join(f"{lo}-{hi}:{100*S[(f>=lo)&(f<hi)].sum()/tot:.0f}" for lo,hi in bands))
