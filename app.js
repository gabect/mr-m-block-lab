
(()=>{'use strict';
const N=5,arrows={UP:'↑',RIGHT:'→',DOWN:'↓',LEFT:'←'},delta={UP:[-1,0],RIGHT:[0,1],DOWN:[1,0],LEFT:[0,-1]};
const levels=[
{title:'1 · First Steps',start:[3,0],goal:[3,2],walls:[],text:'Help the robot move from A4 to C4. Use two RIGHT commands.',hint:'Try RIGHT → RIGHT.'},
{title:'2 · Up and Across',start:[4,0],goal:[2,2],walls:[],text:'Move from A5 to C3. Plan a four-step path.',hint:'You need two UP commands and two RIGHT commands.'},
{title:'3 · Follow the Path',start:[1,1],goal:[2,3],walls:[],text:'Begin at B2. Reach D3. Your program should use three commands.',hint:'UP, RIGHT, DOWN, RIGHT is four commands; find the shorter path.'},
{title:'4 · Around the Block',start:[4,0],goal:[4,4],walls:[[4,2]],text:'Reach E5 without touching the dark obstacle. Find another route.',hint:'Try going UP before moving across, then DOWN.'},
{title:'5 · Zigzag',start:[4,0],goal:[0,4],walls:[[3,0],[2,2],[1,3]],text:'Reach E1. Avoid all obstacles and test each step.',hint:'Begin RIGHT; then look for a clear route upward.'},
{title:'6 · Debug Mission',start:[3,0],goal:[1,2],walls:[[2,1]],starterCode:['UP','RIGHT','UP','RIGHT'],text:'A program with a bug is ALREADY in MY CODE. Press Run first. Watch where it fails, then use Change on the incorrect block(s) and press Run again. Reach C2 without touching the obstacle.',hint:'Look at step 2: RIGHT hits the dark square. Try UP → UP → RIGHT → RIGHT.'}
];
const $=id=>document.getElementById(id);let idx=0,code=[],robot=null,trail=[],cursor=0,playing=false,stopped=false,completed=new Set();
const STORAGE_KEY='blocklab-local-progress-v1',LEGACY_KEY='blocklab-progress',SAVED_FOR=30*24*60*60*1000;
let savedPrograms={},storageAvailable=true,initialLevel=0;
function readSavedProgress(){
 try{
  const raw=localStorage.getItem(STORAGE_KEY);
  if(raw){
   const state=JSON.parse(raw);
   if(!state||typeof state!=='object'||typeof state.savedAt!=='number'||Date.now()-state.savedAt>SAVED_FOR){
    localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_KEY);return;
   }
   completed=new Set(Array.isArray(state.completed)?state.completed.filter(n=>Number.isInteger(n)&&n>=0&&n<levels.length):[]);
   initialLevel=Number.isInteger(state.current)&&state.current>=0&&state.current<levels.length?state.current:0;
   if(state.programs&&typeof state.programs==='object'){
    for(const [number,blocks] of Object.entries(state.programs)){
     if(/^\\d+$/.test(number)&&Number(number)<levels.length&&Array.isArray(blocks)&&blocks.length<=30&&blocks.every(b=>Object.hasOwn(delta,b)))savedPrograms[number]=blocks.slice();
    }
   }
  }else{
   const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY)||'[]');
   if(Array.isArray(legacy))completed=new Set(legacy.filter(n=>Number.isInteger(n)&&n>=0&&n<levels.length));
  }
 }catch{storageAvailable=false}
}
function saveProgress(){
 if(!storageAvailable)return;
 try{
  savedPrograms[idx]=code.slice();
  localStorage.setItem(STORAGE_KEY,JSON.stringify({version:1,savedAt:Date.now(),current:idx,completed:[...completed],programs:savedPrograms}));
  $('saveStatus').textContent='Saved on this browser';
 }catch{storageAvailable=false;$('saveStatus').textContent='Saving unavailable in this browser'}
}
readSavedProgress();
const key=(r,c)=>`${r},${c}`;const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];function feedback(t){$('feedback').textContent=t}
function showGrid(){const lvl=levels[idx],wallset=new Set(lvl.walls.map(x=>key(...x))),pathset=new Set(trail.map(x=>key(...x)));$('grid').innerHTML='';const head=document.createElement('span');head.className='coord';$('grid').append(head);for(let c=0;c<N;c++){let e=document.createElement('span');e.className='coord';e.textContent=String.fromCharCode(65+c);$('grid').append(e)}for(let r=0;r<N;r++){let h=document.createElement('span');h.className='coord';h.textContent=r+1;$('grid').append(h);for(let c=0;c<N;c++){let el=document.createElement('div');el.className='cell';if(wallset.has(key(r,c)))el.classList.add('wall');if(pathset.has(key(r,c)))el.classList.add('trail');if(equal(lvl.goal,[r,c]))el.classList.add('goal');if(equal(lvl.start,[r,c]))el.classList.add('start');if(equal(robot,[r,c])){let rob=document.createElement('div');rob.className='robot';rob.textContent='•ᴗ•';el.append(rob)}el.setAttribute('aria-label',`${String.fromCharCode(65+c)}${r+1}${wallset.has(key(r,c))?', obstacle':''}${equal(lvl.goal,[r,c])?', goal':''}${equal(robot,[r,c])?', robot':''}`);$('grid').append(el)}}}
function showCode(){let el=$('code');el.innerHTML='';code.forEach((dir,i)=>{let node=document.createElement('div');node.className='step'+(i===cursor&&cursor>0?' active':'');let n=document.createElement('span');n.className='number';n.textContent=`STEP ${i+1}`;let l=document.createElement('span');l.textContent=`${arrows[dir]} ${dir}`;let del=document.createElement('button');del.textContent='×';del.setAttribute('aria-label',`Remove step ${i+1}`);del.onclick=()=>{if(playing)return;code.splice(i,1);resetRobot();showCode()};node.append(n,l);if(levels[idx].starterCode){let change=document.createElement('button');change.className='change';change.textContent='Change';change.setAttribute('aria-label',`Change step ${i+1} direction`);change.onclick=()=>{if(playing)return;const order=['UP','RIGHT','DOWN','LEFT'];code[i]=order[(order.indexOf(code[i])+1)%order.length];resetRobot();feedback('Block changed. Press Run to test your fix.');};node.append(change)}node.append(del);el.append(node)});if(!code.length){let e=document.createElement('span');e.className='empty';e.textContent='Your blocks will appear here.';el.append(e)}}
function resetRobot(){playing=false;stopped=false;robot=[...levels[idx].start];trail=[robot];cursor=0;showGrid();showCode();feedback('Ready. Predict your result, then test your code.');saveProgress()}
function add(dir){if(playing)return;if(code.length>=30){feedback('Limit: 30 blocks. Try a shorter program.');return}code.push(dir);resetRobot()}
function load(n){idx=(n+levels.length)%levels.length;code=[...(savedPrograms[idx]||levels[idx].starterCode||[])];$('level').value=idx;$('mission').textContent=levels[idx].text;$('counter').textContent=`${completed.size}/${levels.length} missions solved`;resetRobot();if(levels[idx].starterCode&&!(idx in savedPrograms))feedback('Buggy code is loaded! Press Run, spot the bug, then use Change to fix it.')}
function advance(){if(stopped||cursor>=code.length)return false;let dir=code[cursor],d=delta[dir],next=[robot[0]+d[0],robot[1]+d[1]],walls=new Set(levels[idx].walls.map(w=>key(...w)));cursor++;if(next[0]<0||next[1]<0||next[0]>=N||next[1]>=N){stopped=true;feedback(`Bug at step ${cursor}: ${dir} leaves the grid. Fix your code and try again.`);showCode();return false}if(walls.has(key(...next))){stopped=true;feedback(`Bug at step ${cursor}: ${dir} hits an obstacle. Change your route.`);showCode();return false}robot=next;trail.push(robot);showGrid();showCode();if(equal(robot,levels[idx].goal)){stopped=true;completed.add(idx);saveProgress();$('counter').textContent=`${completed.size}/${levels.length} missions solved`;feedback(`Success! You reached ${String.fromCharCode(65+robot[1])}${robot[0]+1} in ${cursor} step${cursor===1?'':'s'}. Great sequencing!`);return false}if(cursor>=code.length){stopped=true;feedback(`The robot stopped at ${String.fromCharCode(65+robot[1])}${robot[0]+1}, not the goal. Debug and try again.`);return false}return true}
function doStep(){if(playing)return;if(cursor===0&&stopped)resetRobot();if(!code.length){feedback('Add at least one command first.');return}advance()}
async function run(){if(playing)return;if(!code.length){feedback('Add commands to build your program first.');return}resetRobot();playing=true;$('run').disabled=true;$('step').disabled=true;for(let i=0;i<code.length;i++){if(!playing)break;await new Promise(resolve=>setTimeout(resolve,440));let more=advance();if(!more)break}playing=false;$('run').disabled=false;$('step').disabled=false}

function exportEvidence(){
 const lvl=levels[idx], c=document.createElement('canvas');
 const rows=Math.max(1,Math.ceil(code.length/6)); c.width=1400;c.height=Math.max(860,735+rows*92);
 const g=c.getContext('2d'),W=c.width,H=c.height;
 g.fillStyle='#faf8ef';g.fillRect(0,0,W,H);
 g.strokeStyle='#d4e4ee';g.lineWidth=1;
 for(let y=36;y<H;y+=35){g.beginPath();g.moveTo(26,y);g.lineTo(W-26,y);g.stroke()}
 g.strokeStyle='#d26d6d';g.lineWidth=2;g.beginPath();g.moveTo(62,10);g.lineTo(62,H-10);g.stroke();
 const txt=(s,x,y,size=23,bold=false,color='#17191b')=>{g.fillStyle=color;g.font=(bold?'bold ':'')+size+'px Arial, sans-serif';g.fillText(s,x,y)};
 txt('MR. M TECHNOLOGY  /  BLOCK LAB',95,66,34,true);
 txt(lvl.title,95,112,27,true);
 txt('CODE + RESULT  •  STUDENT EVIDENCE',95,148,19,true);
 const x0=100,y0=215,t=78;const walls=new Set(lvl.walls.map(p=>key(...p)));
 txt('ROBOT GRID',x0,y0-22,23,true);
 for(let col=0;col<N;col++)txt(String.fromCharCode(65+col),x0+col*t+31,y0+10,18,true);
 for(let r=0;r<N;r++){
  txt(String(r+1),x0-26,y0+44+r*t,17,true);
  for(let col=0;col<N;col++){
   const x=x0+col*t,y=y0+22+r*t,k=key(r,col);
   g.fillStyle=walls.has(k)?'#474d50':trail.some(p=>key(...p)===k)?'#d5e8f4':'#fffdf8';
   if(equal(lvl.goal,[r,col]))g.fillStyle='#dff2d5';
   g.fillRect(x,y,t-3,t-3);g.strokeStyle='#272727';g.lineWidth=2;g.strokeRect(x,y,t-3,t-3);
   if(equal(lvl.start,[r,col]))txt('S',x+6,y+18,15,true,'#386893');
   if(equal(lvl.goal,[r,col]))txt('G',x+t-23,y+18,15,true,'#38613a');
   if(equal(robot,[r,col])){txt('ROBOT',x+9,y+47,16,true)}
  }
 }
 const codeX=555;txt('MY CODE',codeX,y0-22,23,true);
 if(!code.length)txt('(No blocks)',codeX,y0+42,19,false);
 for(let i=0;i<code.length;i++){
  const col=i%6,row=Math.floor(i/6),x=codeX+col*130,y=y0+22+row*92;
  g.fillStyle=i<cursor?'#f6ec65':'#c8e3f0';g.fillRect(x,y,121,76);
  g.strokeStyle='#202020';g.lineWidth=2;g.strokeRect(x,y,121,76);
  txt('STEP '+(i+1),x+10,y+24,15,true);
  txt(arrows[code[i]]+' '+code[i],x+10,y+55,17,true);
 }
 const base=Math.max(665,y0+22+rows*92+24);
 txt('RESULT',100,base,25,true);
 const result=$('feedback').textContent;
 g.font='21px Arial, sans-serif';
 const words=result.split(/\s+/);let line='',lineY=base+36;
 for(const word of words){const test=line?line+' '+word:word;
  if(g.measureText(test).width>1170&&line){txt(line,100,lineY,21);lineY+=29;line=word}else line=test;
 }
 if(line)txt(line,100,lineY,21);
 txt('Mission '+(idx+1)+' of '+levels.length+'  |  '+(completed.has(idx)?'Completed':'Not yet completed')+'  |  Mr. Maldonado · 2026',100,H-33,18,true);
 return c;
}
function evidenceBlob(canvas){
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Could not create PNG.')),'image/png');
 });
}
async function downloadEvidence(){
 const status=$('evidenceStatus');
 if(playing){status.textContent='Wait until the robot finishes before saving.';return}
 const button=$('downloadEvidence');button.disabled=true;
 try{
  const blob=await evidenceBlob(exportEvidence());
  const url=URL.createObjectURL(blob);
  const link=document.createElement('a');
  link.href=url;link.download='Block-Lab-Mission-'+(idx+1)+'-Evidence.png';
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),60000);
  status.textContent='PNG saved. In Google Slides: Insert → Image → Upload from computer.';
 }catch(err){status.textContent='Could not save image: '+(err.message||'Try again.')}
 finally{button.disabled=false}
}
async function screenshotEvidence(){
 const status=$('evidenceStatus'),button=$('screenshot');
 if(playing){status.textContent='Wait until the robot finishes before copying.';return}
 if(!window.isSecureContext||!navigator.clipboard?.write||typeof ClipboardItem==='undefined'){
  status.textContent='Image copy is blocked in this browser or address. Use Download PNG instead, then insert it into Google Slides.';
  return;
 }
 button.disabled=true;status.textContent='Copying screenshot…';
 try{
  // IMPORTANT: clipboard.write must start during the user click, before any await.
  // Chromium accepts a promised PNG blob in ClipboardItem.
  const canvas=exportEvidence();
  const imagePromise=evidenceBlob(canvas);
  await navigator.clipboard.write([new ClipboardItem({'image/png':imagePromise})]);
  status.textContent='Screenshot copied! Open Google Slides, click the slide, and press Ctrl+V (Mac: Cmd+V).';
 }catch(err){
  status.textContent='Copy was blocked ('+(err.name||'clipboard permission')+'). Click Download PNG and insert the image in Google Slides.';
 }finally{button.disabled=false}
}
$('screenshot').addEventListener('click',screenshotEvidence);
$('downloadEvidence').addEventListener('click',downloadEvidence);

levels.forEach((l,i)=>{let op=document.createElement('option');op.value=i;op.textContent=l.title;$('level').append(op)});$('level').onchange=e=>load(Number(e.target.value));$('prev').onclick=()=>load(idx-1);$('next').onclick=()=>load(idx+1);document.querySelectorAll('.block').forEach(b=>{b.onclick=()=>add(b.dataset.dir);b.addEventListener('dragstart',e=>e.dataTransfer.setData('text/plain',b.dataset.dir))});$('workspace').addEventListener('dragover',e=>e.preventDefault());$('workspace').addEventListener('drop',e=>{e.preventDefault();let d=e.dataTransfer.getData('text/plain');if(delta[d])add(d)});$('run').onclick=run;$('step').onclick=doStep;$('reset').onclick=resetRobot;$('undo').onclick=()=>{code.pop();resetRobot()};$('clear').onclick=()=>{code=[];resetRobot()};$('hint').onclick=()=>feedback(levels[idx].hint);
$('eraseProgress').onclick=()=>{
 if(playing)return;
 if(!confirm('Erase all saved missions and code from this browser?'))return;
 try{localStorage.removeItem(STORAGE_KEY);localStorage.removeItem(LEGACY_KEY)}catch{}
 completed=new Set();savedPrograms={};idx=0;code=[];load(0);
 $('saveStatus').textContent='Progress cleared; new session saved on this browser';
 feedback('Progress erased. You can start again.');
};
load(initialLevel);
})();
