import bpy, math, json, sys
from mathutils import Vector
out=sys.argv[sys.argv.index('--')+1]
bpy.ops.wm.read_factory_settings(use_empty=True)
sc=bpy.context.scene
mat=bpy.data.materials.new('neon');mat.use_nodes=True
nt=mat.node_tree;nt.nodes.clear();em=nt.nodes.new('ShaderNodeEmission');em.inputs[1].default_value=6;em.inputs[0].default_value=(0.2,0.9,1,1)
o=nt.nodes.new('ShaderNodeOutputMaterial');nt.links.new(em.outputs[0],o.inputs[0])
def stroke(coll,pts,name='s'):
    cu=bpy.data.curves.new(name,'CURVE');cu.dimensions='3D';cu.bevel_depth=0.018
    sp=cu.splines.new('POLY');sp.points.add(len(pts)-1)
    for i,(x,y) in enumerate(pts): sp.points[i].co=(x,0,y,1)
    ob=bpy.data.objects.new(name,cu);ob.data.materials.append(mat);coll.objects.link(ob);return ob
def circle(cx,cy,r,n=20,a0=0,a1=2*math.pi):
    return [(cx+r*math.cos(a0+(a1-a0)*i/n),cy+r*math.sin(a0+(a1-a0)*i/n)) for i in range(n+1)]
def limb(p,a1,l1,a2,l2):
    k=(p[0]+l1*math.sin(a1),p[1]-l1*math.cos(a1));e=(k[0]+l2*math.sin(a1+a2),k[1]-l2*math.cos(a1+a2));return [p,k,e]
def figure(hipL,kneeL,hipR,kneeR,armL,elL,armR,elR,lean=0):
    S=[]
    hip=(0,0.95);neck=(lean,1.48);sh=(lean,1.42)
    S.append(circle(lean,1.64,0.13,24))                           # head
    S.append([(lean-0.07,1.66),(lean+0.09,1.66)])                 # visor
    S.append([(lean-0.17,1.42),(lean-0.2,1.1),(-0.13,0.95),(0.13,0.95),(lean+0.2,1.1),(lean+0.17,1.42),(lean-0.17,1.42)])  # torso outline
    S.append([(lean-0.08,1.32),(lean+0.08,1.32),(lean,1.18),(lean-0.08,1.32)])  # chest chevron
    S.append(limb((-0.08,0.95),hipL,0.45,kneeL,0.45)+[])
    S.append(limb((0.08,0.95),hipR,0.45,kneeR,0.45))
    S.append(limb((lean-0.19,1.4),armL,0.3,elL,0.28))
    S.append(limb((lean+0.19,1.4),armR,0.3,elR,0.28))
    # feet
    for l in S[4:6]:
        e=l[-1];l.append((e[0]+0.12,e[1]))
    return S
R=math.radians
poses={
 'idle':figure(R(8),R(-4),R(-8),R(4),R(18),R(-50),R(-18),R(50)),
 'run1':figure(R(35),R(-60),R(-30),R(-10),R(-35),R(-60),R(40),R(70),0.05),
 'run2':figure(R(-30),R(-10),R(35),R(-60),R(40),R(70),R(-35),R(-60),0.05),
 'aim': figure(R(10),R(-4),R(-10),R(4),R(-80),R(-5),R(-70),R(-25)),
}
dead=[[(y-1.0,x*0.4+0.1) for (x,y) in s] for s in poses['idle']]
poses['dead']=dead
# weapons (side profile, metres, muzzle +x)
rifle=[[(-0.45,0.02),(-0.45,-0.09),(-0.3,-0.05),(-0.18,-0.03),(-0.18,0.03),(-0.45,0.02)],
 [(-0.18,0.03),(0.32,0.03),(0.32,-0.035),(0.05,-0.035),(0.01,-0.15),(-0.05,-0.15),(-0.06,-0.035),(-0.18,-0.035)],
 [(0.32,0.0),(0.6,0.0)],[(0.32,-0.02),(0.6,-0.02)],[(0.6,0.012),(0.6,-0.03)],
 [(-0.12,-0.035),(-0.15,-0.16),(-0.1,-0.16),(-0.08,-0.035)],
 [(-0.06,0.03),(-0.06,0.08),(0.14,0.08),(0.14,0.03)],[(0.04,0.08),(0.04,0.11)]]
pistol=[[(-0.08,0.03),(0.16,0.03),(0.16,-0.02),(-0.02,-0.02),(-0.03,-0.13),(-0.09,-0.13),(-0.08,0.03)],
 [(0.0,-0.02),(0.01,-0.06),(0.04,-0.06),(0.04,-0.02)],[(0.13,0.03),(0.13,0.045)],[(-0.06,0.03),(-0.06,0.045)]]
data={'poses':poses,'rifle':rifle,'pistol':pistol}
json.dump(data,open(out+'/art.json','w'),separators=(',',':'))
# preview render: all poses + weapons
sc.render.engine='BLENDER_EEVEE_NEXT' if 'BLENDER_EEVEE_NEXT' in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties['engine'].enum_items] else 'BLENDER_EEVEE'
try: sc.eevee.use_bloom=True
except: pass
w=bpy.data.worlds.new('w');w.color=(0,0,0);sc.world=w
coll=sc.collection
for i,(k,S) in enumerate(poses.items()):
    for s in S:
        ob=stroke(coll,s,k);ob.location.x=i*1.4
for j,W in enumerate([rifle,pistol]):
    for s in W:
        ob=stroke(coll,[(x*2,y*2) for x,y in s],'w');ob.location=(1.5+j*2.2,0,-0.6)
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('c'));coll.objects.link(cam)
cam.data.type='ORTHO';cam.data.ortho_scale=7.6;cam.location=(2.8,-10,0.6);cam.rotation_euler=(math.pi/2,0,0);sc.camera=cam
sc.render.resolution_x=1600;sc.render.resolution_y=900;sc.render.filepath=out+'/blender_lineart.png'
sc.view_settings.view_transform='Standard'
bpy.ops.render.render(write_still=True)
