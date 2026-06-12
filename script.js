const canvas=document.getElementById('game');
const ctx=canvas.getContext('2d');

const scoreEl=document.getElementById('score');
const timeEl=document.getElementById('time');
const livesEl=document.getElementById('lives');
const gameOverEl=document.getElementById('gameOver');

let score=0,time=60,lives=3,ended=false;

const player={x:200,y:500,w:28,h:28,vy:0};
const gravity=0.45;
const jump=-11;

let left=false,right=false;
let platforms=[];
let strawberries=[];

function makeLevel(){
 platforms=[]; strawberries=[];
 for(let i=0;i<18;i++){
  const p={x:Math.random()*320+20,y:580-i*70,w:90,h:12};
  platforms.push(p);
  if(Math.random()<0.35){
   strawberries.push({x:p.x+30,y:p.y-18});
  }
 }
}

makeLevel();

document.addEventListener('keydown',e=>{
 if(e.key==='ArrowLeft') left=true;
 if(e.key==='ArrowRight') right=true;
});

document.addEventListener('keyup',e=>{
 if(e.key==='ArrowLeft') left=false;
 if(e.key==='ArrowRight') right=false;
});

function loseLife(){
 lives--;
 livesEl.textContent='❤️'.repeat(lives);

 if(lives<=0){
  ended=true;
  gameOverEl.classList.remove('hidden');
  return;
 }

 player.x=200;
 player.y=300;
 player.vy=0;
}

function update(){
 if(ended) return;

 if(left) player.x-=5;
 if(right) player.x+=5;

 player.vy+=gravity;
 player.y+=player.vy;

 if(player.x<0) player.x=0;
 if(player.x>canvas.width-player.w) player.x=canvas.width-player.w;

 for(const p of platforms){
  if(player.vy>0 &&
     player.x+player.w>p.x &&
     player.x<p.x+p.w &&
     player.y+player.h>p.y &&
     player.y+player.h<p.y+15){
      player.vy=jump;
      score+=5;
  }
 }

 strawberries=strawberries.filter(s=>{
  const hit=player.x<s.x+20 && player.x+player.w>s.x &&
            player.y<s.y+20 && player.y+player.h>s.y;
  if(hit){
    score+=50;
    time+=5;
    return false;
  }
  return true;
 });

 if(player.y<250){
  const diff=250-player.y;
  player.y=250;

  platforms.forEach(p=>p.y+=diff);
  strawberries.forEach(s=>s.y+=diff);

  score+=Math.floor(diff);

  platforms=platforms.filter(p=>p.y<650);

  while(platforms.length<18){
    const top=Math.min(...platforms.map(p=>p.y));
    const p={x:Math.random()*320+20,y:top-70,w:90,h:12};
    platforms.push(p);

    if(Math.random()<0.35){
      strawberries.push({x:p.x+30,y:p.y-18});
    }
  }
 }

 if(player.y>canvas.height){
  loseLife();
 }

 scoreEl.textContent=score;
 timeEl.textContent=time;
}

function draw(){
 ctx.clearRect(0,0,canvas.width,canvas.height);

 for(const p of platforms){
  ctx.fillStyle='#60a5fa';
  ctx.fillRect(p.x,p.y,p.w,p.h);
 }

 ctx.font='20px Arial';
 strawberries.forEach(s=>ctx.fillText('🍓',s.x,s.y));

 ctx.font='28px Arial';
 ctx.fillText('🧑',player.x,player.y+24);
}

function loop(){
 update();
 draw();
 requestAnimationFrame(loop);
}

setInterval(()=>{
 if(ended) return;
 time--;
 timeEl.textContent=time;
 if(time<=0) loseLife();
},1000);

loop();
