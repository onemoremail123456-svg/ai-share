(function(){
'use strict';

var old=document.getElementById('mimo-x-panel');
if(old)old.remove();

var C={scrollPause:800,loadWait:2500,switchWait:3500,maxScrolls:500,stableHits:3,sbScrollWait:1200};

var P=document.createElement('div');
P.id='mimo-x-panel';
P.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0d1117;color:#c9d1d9;font:11px/1.5 ui-monospace,monospace;padding:10px 14px;max-height:42vh;overflow:auto;border-bottom:2px solid #f85149;box-shadow:0 8px 32px rgba(0,0,0,.6)';
P.onclick=function(){P.remove()};
document.body.appendChild(P);

function log(m,c){
  var d=document.createElement('div');
  d.style.cssText='color:'+(c||'#c9d1d9');
  d.textContent=m;
  P.appendChild(d);
  P.scrollTop=1e9;
}
function wait(ms){return new Promise(function(r){setTimeout(r,ms)})}

function qsa(s){try{return[].slice.call(document.querySelectorAll(s))}catch(e){return[]}}
function mq(sels){for(var i=0;i<sels.length;i++){var r=qsa(sels[i]);if(r.length)return r}return[]}
function ms(sels){for(var i=0;i<sels.length;i++){try{var r=document.querySelector(sels[i]);if(r)return r}catch(e){}}return null}

function findSidebar(){
  return ms([
    '[class*="sidebar"]','[class*="side-bar"]','[class*="SideBar"]',
    '[class*="history"]','[class*="session-list"]','[class*="chat-list"]',
    '[class*="conversation-list"]','[class*="nav-panel"]',
    'aside','[role="navigation"]','[role="complementary"]',
    '[class*="left-panel"]','[class*="drawer"]'
  ]);
}

function findSidebarItems(){
  var items=mq([
    '[class*="sidebar"] a','[class*="sidebar"] li','[class*="sidebar"] [class*="item"]',
    '[class*="sidebar"] [class*="session"]','[class*="sidebar"] [class*="chat"]',
    '[class*="history"] a','[class*="history"] li','[class*="history"] [class*="item"]',
    '[class*="session-list"] > *','[class*="sessions"] > *',
    '[class*="chat-list"] > *','[class*="chats"] > *',
    '[class*="conversation-list"] > *','[class*="conversations"] > *',
    'nav [class*="item"]','nav [class*="session"]','nav li a',
    'aside a','aside [class*="item"]',
    '[role="navigation"] a','[role="listitem"]','[role="option"]'
  ]);

  if(!items.length){
    items=qsa('a,button,[role="button"],li').filter(function(el){
      var r=el.getBoundingClientRect();
      if(r.left>window.innerWidth*0.45)return false;
      var t=el.textContent.trim();
      return t.length>=3&&t.length<=200&&r.width>20&&r.height>15;
    });
  }

  var out=[];
  for(var i=0;i<items.length;i++){
    var el=items[i],dom=false;
    for(var j=0;j<out.length;j++){
      if(out[j].contains(el)){dom=true;break}
      if(el.contains(out[j])){out.splice(j,1);j--}
    }
    if(!dom)out.push(el);
  }
  return out;
}

async function scrollSidebar(){
  var sb=findSidebar();
  if(!sb)return;
  log('Scrolling sidebar...');
  var prev=0,stable=0;
  for(var i=0;i<60;i++){
    sb.scrollTop=sb.scrollHeight;
    await wait(C.sbScrollWait);
    var h=sb.scrollHeight;
    if(h===prev){stable++;if(stable>=3)break}else stable=0;
    prev=h;
  }
  sb.scrollTop=0;
  await wait(500);
}

function findScrollBox(){
  var box=ms([
    '[class*="chat-scroll"]','[class*="msg-scroll"]','[class*="message-scroll"]',
    '[class*="message-list"]','[class*="msg-list"]',
    '[class*="chat-body"]','[class*="chat-content"]','[class*="chat-container"]',
    '[class*="chat-area"]','[class*="messages"]','[class*="message-area"]',
    '[class*="conversation-body"]','[class*="conversation-content"]',
    '[class*="thread"]','[class*="chat-view"]'
  ]);
  if(box&&box.scrollHeight>box.clientHeight+50)return box;

  var main=ms(['main','[role="main"]','[class*="content"]'])||document.body;
  var best=null,bestA=0;
  var divs=main.querySelectorAll('div');
  for(var i=0;i<divs.length;i++){
    var el=divs[i];
    if(el.scrollHeight-el.clientHeight>50){
      var a=el.clientWidth*el.clientHeight;
      if(a>bestA){bestA=a;best=el}
    }
  }
  return best;
}

async function scrollToTop(box){
  log('Loading full history...');
  var prev=0,stable=0,pass=0;
  while(pass<C.maxScrolls){
    box.scrollTop=0;
    await wait(C.scrollPause);
    var h=box.scrollHeight;
    if(h===prev){stable++;if(stable>=C.stableHits){log('Reached beginning.','lime');break}}
    else stable=0;
    if(pass%15===0)log('  Pass '+pass+' | height:'+h);
    prev=h;pass++;
  }
  await wait(C.loadWait);
}

function getMsgElements(){
  var els=mq([
    '[class*="message-bubble"]','[class*="chat-message"]','[class*="msg-item"]',
    '[class*="message-wrapper"]','[class*="message-container"]','[class*="message-content"]',
    '[class*="bubble"]','[class*="chat-bubble"]',
    '[data-message-id]','[data-message-role]','[data-role]','[data-type="message"]',
    '[class*="user-msg"]','[class*="user-message"]',
    '[class*="assistant-msg"]','[class*="assistant-message"]',
    '[class*="ai-message"]','[class*="bot-message"]','[class*="model-message"]',
    '[class*="markdown-body"]','[class*="human-msg"]'
  ]);
  if(els.length)return els;

  var area=ms(['main','[class*="chat"]','[class*="conversation"]','[role="main"]']);
  if(!area)return[];
  var all=area.querySelectorAll('div,p,section,article');
  els=[];
  for(var i=0;i<all.length;i++){
    var el=all[i];
    if(el.textContent.trim().length<8)continue;
    if(el.offsetHeight<25)continue;
    if(el.querySelectorAll('[class*="message"],[class*="bubble"]').length>1)continue;
    els.push(el);
  }
  return els;
}

function classify(el,idx){
  var bag=[
    el.className?el.className.toString():'',
    el.parentElement&&el.parentElement.className?el.parentElement.className.toString():'',
    el.getAttribute('data-role')||'',
    el.getAttribute('data-type')||''
  ].join(' ').toLowerCase();

  if(/(^|[^a-z])user|human|me[-_]|sender/.test(bag))return'user';
  if(/assistant|ai[-_]|bot|reply|answer|model|mimo|system/.test(bag))return'assistant';

  try{
    var s=getComputedStyle(el);
    if(s.alignSelf==='flex-end')return'user';
    if(s.alignSelf==='flex-start')return'assistant';
    if(parseInt(s.marginLeft)>100)return'user';
    if(parseInt(s.marginRight)>100)return'assistant';
  }catch(e){}

  if(el.querySelector('pre,code,.hljs,[class*="code"]'))return'assistant';

  return idx%2===0?'user':'assistant';
}

async function extractChat(scrollBox){
  if(scrollBox)await scrollToTop(scrollBox);

  var raw=getMsgElements();
  if(!raw.length)return[];

  raw.sort(function(a,b){
    return a===b?0:a.compareDocumentPosition(b)&4?-1:1;
  });

  var clean=[];
  for(var i=0;i<raw.length;i++){
    var el=raw[i],dom=false;
    for(var j=clean.length-1;j>=0;j--){
      if(clean[j].contains(el)){dom=true;break}
      if(el.contains(clean[j]))clean.splice(j,1);
    }
    if(!dom)clean.push(el);
  }

  var msgs=[];
  for(var i=0;i<clean.length;i++){
    var text=(clean[i].innerText||clean[i].textContent||'').trim().replace(/\n{3,}/g,'\n\n');
    if(text)msgs.push({role:classify(clean[i],i),text:text});
  }
  return msgs;
}

function download(name,data){
  try{
    var b=new Blob([data],{type:'text/plain;charset=utf-8'});
    var u=URL.createObjectURL(b);
    var a=document.createElement('a');
    a.href=u;a.download=name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){a.remove();URL.revokeObjectURL(u)},1000);
    log('Downloaded: '+name,'lime');
    return;
  }catch(e){}

  try{
    var a2=document.createElement('a');
    a2.href='data:text/plain;charset=utf-8,'+encodeURIComponent(data);
    a2.download=name;
    document.body.appendChild(a2);
    a2.click();
    a2.remove();
    log('Downloaded: '+name,'lime');
    return;
  }catch(e){}

  var w=window.open();
  if(w){w.document.write('<pre>'+data.replace(/</g,'&lt;')+'</pre>');w.document.close()}
  log('Opened in new tab','orange');
}

async function main(){
  log('═══ MiMo Chat Export v1.0 ═══','#58a6ff');
  log('Page: '+location.hostname);

  var burger=ms([
    '[class*="hamburger"]','[class*="menu-btn"]','[class*="menu-toggle"]',
    '[aria-label*="menu"]','[aria-label*="sidebar"]','[class*="sidebar-toggle"]'
  ]);
  if(burger&&window.innerWidth<768){
    log('Mobile: opening sidebar...');
    burger.click();
    await wait(1500);
  }

  await scrollSidebar();
  var items=findSidebarItems();
  log('Conversations found: '+items.length);

  if(items.length>1){
    log('Exporting '+items.length+' chats...');
    var master='',count=0;

    for(var i=0;i<items.length;i++){
      var el=items[i];
      var title=(el.textContent||'').trim().substring(0,150)||'Chat '+(i+1);
      log('\n['+(i+1)+'/'+items.length+'] '+title);

      el.click();
      await wait(100);
      el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));
      await wait(C.switchWait);

      var box=findScrollBox();
      var msgs=await extractChat(box);
      log('  -> '+msgs.length+' messages');

      if(msgs.length){
        master+='===== CHAT '+(i+1)+' =====\n'+title+'\n'+'-'.repeat(20)+'\n\n';
        for(var j=0;j<msgs.length;j++){
          master+=(msgs[j].role==='user'?'USER':'AI')+':\n'+msgs[j].text+'\n\n';
        }
        master+='\n';
        count++;
      }
    }

    if(count){
      download('mimo-all-chats.txt',master);
      log('\nExported '+count+' chats!','lime');
    }else{
      log('\nNo messages found. Run diagnostics.','red');
    }

  }else{
    log('Single chat mode');
    var box=findScrollBox();
    var msgs=await extractChat(box);
    log('Messages: '+msgs.length);

    if(msgs.length){
      var t=ms(['[class*="title"]','h1','h2']);
      var title=(t?t.textContent:document.title||'Chat').trim();
      var txt='===== CHAT =====\n'+title+'\n'+'-'.repeat(20)+'\n\n';
      for(var j=0;j<msgs.length;j++){
        txt+=(msgs[j].role==='user'?'USER':'AI')+':\n'+msgs[j].text+'\n\n';
      }
      download('mimo-chat.txt',txt);
      log('\nExported '+msgs.length+' messages!','lime');
    }else{
      log('\nNo messages found.','red');
    }
  }

  setTimeout(function(){P.remove()},15000);
}

main().catch(function(e){
  log('Error: '+e.message,'red');
  console.error('[MiMo Export]',e);
});

})();
