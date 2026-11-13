# Optional native GLSL compile check. This does not run a browser or verify UI layout.
import ctypes as C
from ctypes.util import find_library
import json, sys
inputs=json.load(sys.stdin)
library=find_library('EGL')
if not library:
 print('Native EGL compiler unavailable.');sys.exit(77)
E=C.CDLL(library)
E.eglGetProcAddress.restype=C.c_void_p
E.eglGetProcAddress.argtypes=[C.c_char_p]
def proc(name, ret, args):
 ptr=E.eglGetProcAddress(name.encode())
 if not ptr: raise RuntimeError('Unavailable EGL/GLES function '+name)
 return C.CFUNCTYPE(ret,*args)(ptr)
vp=C.c_void_p; I=C.c_int; U=C.c_uint
try:
 get_display=proc('eglGetPlatformDisplayEXT',vp,[U,vp,C.POINTER(I)])
 display=get_display(0x31DD,None,None)
 E.eglInitialize.argtypes=[vp,C.POINTER(I),C.POINTER(I)];E.eglInitialize.restype=U
 major=I();minor=I()
 if not E.eglInitialize(display,C.byref(major),C.byref(minor)):
  print('Headless EGL display unavailable.');sys.exit(77)
 E.eglBindAPI.argtypes=[U];E.eglBindAPI.restype=U
 assert E.eglBindAPI(0x30A0)
 attrs=(I*11)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3038)
 config=vp();count=I()
 E.eglChooseConfig.argtypes=[vp,C.POINTER(I),C.POINTER(vp),I,C.POINTER(I)];E.eglChooseConfig.restype=U
 assert E.eglChooseConfig(display,attrs,C.byref(config),1,C.byref(count)) and count.value
 E.eglCreateContext.argtypes=[vp,vp,vp,C.POINTER(I)];E.eglCreateContext.restype=vp
 context=E.eglCreateContext(display,config,None,(I*3)(0x3098,2,0x3038))
 if not context:
  print('Native GLES context unavailable.');sys.exit(77)
 E.eglMakeCurrent.argtypes=[vp,vp,vp,vp];E.eglMakeCurrent.restype=U
 assert E.eglMakeCurrent(display,None,None,context)
except (AssertionError,RuntimeError) as error:
 print("Native GLES setup unavailable:",str(error));sys.exit(77)
create=proc('glCreateShader',U,[U]);source=proc('glShaderSource',None,[U,I,C.POINTER(C.c_char_p),C.POINTER(I)]);compile_=proc('glCompileShader',None,[U]);get=proc('glGetShaderiv',None,[U,U,C.POINTER(I)]);log=proc('glGetShaderInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
shaders=[]
for path,kind in [('vertex',0x8B31),('fragment',0x8B30)]:
 shader=create(kind);data=inputs[path].encode();buf=C.c_char_p(data);source(shader,1,C.byref(buf),None);compile_(shader);ok=I();get(shader,0x8B81,C.byref(ok));info=C.create_string_buffer(65536);log(shader,65536,None,info)
 if not ok.value: raise RuntimeError(path+'\n'+info.value.decode())
 shaders.append(shader)
create_program=proc('glCreateProgram',U,[]);attach=proc('glAttachShader',None,[U,U]);link=proc('glLinkProgram',None,[U]);get_program=proc('glGetProgramiv',None,[U,U,C.POINTER(I)]);log_program=proc('glGetProgramInfoLog',None,[U,I,C.POINTER(I),C.c_char_p])
program=create_program()
for shader in shaders:attach(program,shader)
link(program);ok=I();get_program(program,0x8B82,C.byref(ok));info=C.create_string_buffer(65536);log_program(program,65536,None,info)
if not ok.value:raise RuntimeError(info.value.decode())
get_string=proc('glGetString',C.c_char_p,[U])
print('Compiled and linked background shader in '+get_string(0x1F02).decode())
print('Renderer: '+get_string(0x1F01).decode())
proc('glDeleteProgram',None,[U])(program)
for shader in shaders:proc('glDeleteShader',None,[U])(shader)
E.eglMakeCurrent(display,None,None,None)
E.eglDestroyContext.argtypes=[vp,vp];E.eglDestroyContext(display,context)
E.eglTerminate.argtypes=[vp];E.eglTerminate(display)
