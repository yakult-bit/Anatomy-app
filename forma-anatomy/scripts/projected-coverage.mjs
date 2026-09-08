// Offline CPU silhouette rasterization of the real imported triangles. No
// browser screenshot or invented geometry is used for question eligibility.
const N=192;
export function projectedCoverage(pieces,bounds,aspect,scale=1){
 const center=bounds.min.map((v,i)=>(v+bounds.max[i])/2),radius=Math.hypot(...bounds.max.map((v,i)=>v-bounds.min[i]))/2;
 const norm=Math.hypot(.12,.05,1),dir=[.12/norm,.05/norm,1/norm],rnorm=Math.hypot(dir[0],dir[2]),right=[dir[2]/rnorm,0,-dir[0]/rnorm],up=[dir[1]*right[2],dir[2]*right[0]-dir[0]*right[2],-dir[1]*right[0]],tan=Math.tan(42*Math.PI/360);
 const distance=radius/Math.sin(Math.atan(tan*Math.min(1,aspect)))*1.6*scale;
 function project(x,y,z){x-=center[0];y-=center[1];z-=center[2];const depth=distance-x*dir[0]-y*dir[1]-z*dir[2];return [(x*right[0]+z*right[2])/(depth*tan*aspect),(x*up[0]+y*up[1]+z*up[2])/(depth*tan)]}
 // Normalize onto projected bounds so tiny/thin objects have enough samples.
 let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
 for(let b=0;b<8;b++){const [x,y]=project(...[0,1,2].map(i=>(b>>i)&1?bounds.max[i]:bounds.min[i]));minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
 const mask=new Uint8Array(N*N),sx=N/(maxX-minX),sy=N/(maxY-minY);
 for(const piece of pieces){const positions=piece.positions,indices=piece.indices,points=new Float32Array(positions.length/3*2);for(let i=0;i<positions.length;i+=3){const [x,y]=project(positions[i],positions[i+1],positions[i+2]);points[i/3*2]=(x-minX)*sx;points[i/3*2+1]=(y-minY)*sy}
  for(let i=0;i<indices.length;i+=3){const a=indices[i]*2,b=indices[i+1]*2,c=indices[i+2]*2,ax=points[a],ay=points[a+1],bx=points[b],by=points[b+1],cx=points[c],cy=points[c+1];const area=(bx-ax)*(cy-ay)-(by-ay)*(cx-ax);if(Math.abs(area)<1e-10)continue;const sign=area>0?1:-1;const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx))),x1=Math.min(N-1,Math.ceil(Math.max(ax,bx,cx))),y0=Math.max(0,Math.floor(Math.min(ay,by,cy))),y1=Math.min(N-1,Math.ceil(Math.max(ay,by,cy)));
   for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){if(mask[y*N+x])continue;const px=x+.5,py=y+.5;if(((bx-ax)*(py-ay)-(by-ay)*(px-ax))*sign>=0&&((cx-bx)*(py-by)-(cy-by)*(px-bx))*sign>=0&&((ax-cx)*(py-cy)-(ay-cy)*(px-cx))*sign>=0)mask[y*N+x]=1;}
  }
 }
 let filled=0,clusters=0,largest=0;const queue=new Int32Array(N*N);
 for(let k=0;k<mask.length;k++){if(mask[k]!==1)continue;clusters++;let start=0,end=1;queue[0]=k;mask[k]=2;while(start<end){const at=queue[start++],x=at%N,y=Math.floor(at/N);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=N||ny>=N)continue;const next=ny*N+nx;if(mask[next]===1){mask[next]=2;queue[end++]=next}}}filled+=end;largest=Math.max(largest,end)}
 return {coverage:filled/(N*N),clusters,dominantFraction:filled?largest/filled:0};
}
