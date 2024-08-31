//console.log2=console.log;
//console.log=(data)=>chrome.runtime.sendMessage({command:'log', data:data});
//constante para 1 segundo em milisegundos
const sec=1000;

//Funções que calculam a soma e a média dos elementos de um array
const sum=(arr)=>arr.length>0?arr.reduce((a,b)=>a+b):0;
const avg=(arr)=>arr.length>0?sum(arr)/arr.length: 0;

//Converte o handicap do formato 2.5,3.0  para 2.75, por exemplo
const calcHand=(hand_str)=>avg(hand_str.split(',').map(e=>Number(e) ));

//Shorthands $ e $$
const $=(q)=>document.querySelector(q);
const $$=(q)=>document.querySelectorAll(q);

//Shorthands $ e $$ para os elementos
Element.prototype.$ =function(q) { return this.querySelector(q)  };
Element.prototype.$$=function(q) { return this.querySelectorAll(q) };


//Funcão genérica envia os eventos do contentScript o backgroundScript
const sendEvent=async(ev, input)=>{
   
   //Gera um uuid para cada evento a ser enviado
   const uuid=crypto.randomUUID();
   let completed=false;
   input['uuid']=uuid;
   
   //Envia o evento com o input( os paramentros do evento)
   chrome.runtime.sendMessage({command:ev, data:input});
   
   //Aguarda até a variável uuid ser preenchida com true
   while(!completed){
      await sleep(100);
      chrome.storage.local.get([uuid], v=>completed=v[uuid] ); 
   }
   
   //Remove a váriavel uuid  depois da conclusão evento
   chrome.storage.local.remove([uuid] ); 
}


//Todos os eventos possíveis 
const sendClick=async(input)=>await sendEvent('click', input);
const sendMove=async(input)=>await sendEvent('move', input);
const sendScroll=async(input)=>await sendEvent('scroll', input);
const sendType=async(input)=>await sendEvent('type', input);

//Envia o evento para baixar as stats
const insertStats=async(input)=> await sendEvent('stats',input);



//Move o cursor para centro da janela
const moveToCenterOfWindow=async()=>{
   const {screenX,screenY,outerWidth,outerHeight}=window;
   const x=screenX+outerWidth/2;
   const y=screenX+outerHeight/2;
   
   await sendMove({x,y});
}


//Aguarda até um elemento existir ou dar o timeout
const waitFor=async(el, timeout=20*sec)=>{
   const interval=100;
   let sum_interval=0
   while(el==null) {
      await sleep(interval);
      sum_interval+=interval;
      if (sum_interval>=timeout) break;
   }
   //Sempre retorna o elemento, senão existir será null
   return el;
}





const adjustBrower=()=>{
   if ( window.navigator.userAgent.includes('Chrome') ) return {aX:0, aY:-11};
   if ( window.navigator.userAgent.includes('Firefox') ) return {aX:1, aY:-5};
   return {aX:0, aY:0};
}

//Adiciona o evento rclick (click pelo nodejs) a todos os elementos
Element.prototype.rclick = async function(shift=[0,0,0,0]){
   
   //Ajuste de posição do navegador, 
   const {aX,aY}=adjustBrower();
   
   //Ajuste para não usar toda área do objecto
   const [sx1,sy1,sx2,sy2]=shift;
   
   //wX e wY, são a posição da janela do navegador em relação a tela
   const [wX, wY] = [window.screenX, window.screenY];
   
   //dX e dY diferença entre as medidas externas e internas da janela
   const [dX, dY] = [window.outerWidth - window.innerWidth, window.outerHeight - window.innerHeight];

   //eX, eY são a posição do elemento a ser clicado em relação a janela
   const rect = this.getBoundingClientRect();
   const [eX, eY] = [rect.left, rect.top];

   //Define as coordenadas da área do objeto em relação a tela, dados todos os ajustes
   const x1 = Math.ceil(eX + wX + dX / 2 + aX)+sx1;  //ajustar  
   const y1 = Math.ceil(eY + wY + dY+ aY)+sy1;
   const x2 = x1 + this.offsetWidth - 1 + sx2;
   const y2 = y1 + this.offsetHeight - 1 + sy2;

   //Envia a área para a função que faz o click pelo backgroundScript
   await sendClick({ x1,y1, x2,y2});

};


//Adiciona o evento rscroll (scroll pelo nodejs) a todos os elementos
Element.prototype.rscroll = async function(){
   await moveToCenterOfWindow();
   
   const eH=this.getBoundingClientRect().height;  //Altura do elemento
   const wH=window.innerHeight;  //Altura da janela 
   
   //dist é a distância do objeto ao centro da janela, no eixo Y
   let dist=this.getBoundingClientRect().y - wH/2;
   
   //Enquanto a dist maior a 1/4  da altura da janela faz o scroll
   while(Math.abs(dist)>wH/4 ){
      
      //Se a janela "scrollou" até o limite, para dar scroll
      if( 
         ((dist<0) && (window.scrollY==0))  ||
         ((dist>0) && (window.scrollY==window.scrollMaxY)) 
      ) break;
      
      //Desloca a scrollbar exatamente 1/2 da altura da janela
      await sendScroll({y: Math.sign(dist) * wH/2 });
      
      //Recalcula a distância do objeto ao centro da janela, no eixo Y
      dist=this.getBoundingClientRect().y - wH/2;
   }
  
};








const preReq=async()=>{
   

   

   
};








const main=async()=>{
   
   let ts=Math.floor( (+new Date)/1000);
   let dt=Math.floor(ts/(24*60*60))*(24*60*60);

   let jogos=[];

   for (let e of [...$$('.fixture-preview')]) {
      try{
         jogos.push({
            state:e.$('.wrapper span').innerText,   //Halftime,
            home: e.$$('.teams a')[0].innerText,
            away: e.$$('.teams a')[1].innerText,
            gh: Number(e.$$('.score-wrapper span')[0].innerText),
            ga: Number(e.$$('.score-wrapper span')[1].innerText),
            
            gl: Number(e.$$('.outcomes')[0].$$('.name')[0].innerText.split(' ')[1]),
            oo: Number(e.$$('.outcomes')[0].$$('.odds span')[0].innerText),
            ou: Number(e.$$('.outcomes')[0].$$('.odds span')[1].innerText),
            
            ah: Number(e.$$('.outcomes')[2].$$('.name')[0].innerText),
            oh: Number(e.$$('.outcomes')[2].$$('.odds span')[0].innerText),
            oa: Number(e.$$('.outcomes')[2].$$('.odds span')[1].innerText),
           
            ts,
            dt, 
         });
      }catch(e){ }
}


jogos=jogos.filter(j=>j.state=='Halftime');

await fetch('https://bot-ao.com/stake/insert_jogos.php?jogos='+encodeURI(JSON.stringify(jogos)) );
   
   
}






(async()=>{
   

   
   
   //Loop a cada 10 segundos
   while(true) try{
   
      
      await sleep(10*1000);
      
      //Se não estiver na tela o Inplay  não faz nada
      //if ( !location.hash.includes('#/IP') )  continue;
      
     
      
      console.log('Loop Principal');
   
      //Aguarda a página estar complementamente carregada
      //await waitFor( $('.ovm-CompetitionList') );
 
     
            
      await preReq();
       
       
      await main();
      

   } 
   catch(e){ console.log(e) }
    
})();  
 