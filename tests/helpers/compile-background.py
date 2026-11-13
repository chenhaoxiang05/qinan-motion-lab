# Optional native GLSL compile check. This does not run a browser or verify UI layout.
import ctypes as C
from ctypes.util import find_library
import json, sys, hashlib
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
if inputs.get('frames'):
 width,height=inputs.get('size',[640,420])
 gen_textures=proc('glGenTextures',None,[I,C.POINTER(U)]);bind_texture=proc('glBindTexture',None,[U,U])
 tex_image=proc('glTexImage2D',None,[U,I,I,I,I,I,U,U,vp]);tex_parameter=proc('glTexParameteri',None,[U,U,I])
 texture=U();gen_textures(1,C.byref(texture));bind_texture(0x0DE1,texture)
 for parameter in (0x2800,0x2801):tex_parameter(0x0DE1,parameter,0x2600)
 tex_image(0x0DE1,0,0x1908,width,height,0,0x1908,0x1401,None)
 framebuffer=U();proc('glGenFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(framebuffer))
 proc('glBindFramebuffer',None,[U,U])(0x8D40,framebuffer)
 proc('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,texture,0)
 assert proc('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5,'Incomplete native framebuffer'
 proc('glViewport',None,[I,I,I,I])(0,0,width,height)
 proc('glUseProgram',None,[U])(program)
 F=C.c_float
 location=proc('glGetUniformLocation',I,[U,C.c_char_p]);uniform1=proc('glUniform1f',None,[I,F]);uniform2=proc('glUniform2f',None,[I,F,F]);uniform4=proc('glUniform4f',None,[I,F,F,F,F])
 defaults={'uResolution':[width,height],'uFieldSize':[110,95],'uCenter':[.64,.51],
  'uPointer':[.5,.5],'uFocus':[0,0],'uTitleRect':[12,height-160,190,145],
  'uPulseOrigin':[.5,.5],'uPulseAge':-1,'uDim':0,'uEntranceProgress':1,
  'uActivePortal':-1,'uPortalAge':100,'uMobile':0,'uPointerActivity':0}
 defaults.update(inputs.get('uniforms',{}))
 def set_uniform(name,value):
  loc=location(program,name.encode())
  if loc<0:return
  if isinstance(value,(int,float)):uniform1(loc,value)
  elif len(value)==2:uniform2(loc,*value)
  elif len(value)==4:uniform4(loc,*value)
 for name,value in defaults.items():set_uniform(name,value)
 for i,anchor in enumerate(inputs.get('anchors',[[30,110],[width-30,height-65],[90,40],[width-25,50]])):
  set_uniform('uPortalAnchors['+str(i)+']',anchor)
 vertices=(F*20)(-1,-1,0,0,0,1,-1,0,1,0,-1,1,0,0,1,1,1,0,1,1)
 buffer=U();proc('glGenBuffers',None,[I,C.POINTER(U)])(1,C.byref(buffer))
 proc('glBindBuffer',None,[U,U])(0x8892,buffer)
 proc('glBufferData',None,[U,C.c_ssize_t,vp,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
 attrib=proc('glGetAttribLocation',I,[U,C.c_char_p]);enable=proc('glEnableVertexAttribArray',None,[U]);pointer=proc('glVertexAttribPointer',None,[U,I,U,U,I,vp])
 for name,size,offset in [('position',3,0),('uv',2,12)]:
  slot=attrib(program,name.encode());enable(slot);pointer(slot,size,0x1406,0,20,C.c_void_p(offset))
 draw=proc('glDrawArrays',None,[U,I,I]);read=proc('glReadPixels',None,[I,I,I,I,U,U,vp])
 frames=[];raw_frames=[]
 for frame in inputs['frames']:
  for name,value in frame.items():
   if name!='name':set_uniform(name,value)
  draw(0x0005,0,4)
  pixels=(C.c_ubyte*(width*height*4))();read(0,0,width,height,0x1908,0x1401,pixels)
  raw=bytes(pixels);raw_frames.append(raw)
  regions={}
  for name,[x,y,w,h] in inputs.get('regions',{}).items():
   region=b''.join(raw[((y+row)*width+x)*4:((y+row)*width+x+w)*4] for row in range(h))
   regions[name]=hashlib.sha256(region).hexdigest()
  samples={name:list(raw[(y*width+x)*4:(y*width+x)*4+3]) for name,[x,y] in inputs.get('samples',{}).items()}
  frames.append({'name':frame.get('name',''),'hash':hashlib.sha256(raw).hexdigest(),'regions':regions,'samples':samples})
 # Returning numeric differences keeps tests small; no screenshots are claimed.
 differences=[]
 for first,second in zip(raw_frames,raw_frames[1:]):
  differences.append(sum(first[i:i+3]!=second[i:i+3] for i in range(0,len(first),4)))
 print(json.dumps({'frames':frames,'changed_pixels':differences}))
 proc('glDeleteBuffers',None,[I,C.POINTER(U)])(1,C.byref(buffer))
 proc('glDeleteFramebuffers',None,[I,C.POINTER(U)])(1,C.byref(framebuffer))
 proc('glDeleteTextures',None,[I,C.POINTER(U)])(1,C.byref(texture))
proc('glDeleteProgram',None,[U])(program)
for shader in shaders:proc('glDeleteShader',None,[U])(shader)
E.eglMakeCurrent(display,None,None,None)
E.eglDestroyContext.argtypes=[vp,vp];E.eglDestroyContext(display,context)
E.eglTerminate.argtypes=[vp];E.eglTerminate(display)
