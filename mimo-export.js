(function(){
'use strict';

var old=document.getElementById('mimo-x-panel');
if(old)old.remove();

var C={scrollPause:1000,loadWait:2500,switchWait:3500,maxScrolls:500,stableHits:3,sbScrollWait:1200};

var P=document.createElement('div');
P.id='mimo-x-panel';
P.style.cssText='position:fixed;top:0;left:0;right:0;z-index:2147483647;background:#0d1117;color:#c9d1d9;font:11px/1.5 ui-monospace,monospace;padding:10px 14px;max-height:42vh;overflow:auto;border-bottom:2px solid #58a6ff;box-shadow:0 8px 32px rgba(0,0,0,.6)';
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
function ms(sels){for(var i=0;i<sels.length;i++){try{var r=document.querySelector(sels[i]);if(r)return r}catch(e){}}return null}

function findSidebarItems(){
  // Look for items in the history panel based on common text patterns or sidebar navigation clues
  var items = qsa('a, button, [role="button"], li, [class*="item"]').filter(function(el){
    var r = el.getBoundingClientRect();
    if(r.left > window.innerWidth * 0.5) return false; // Must be on left side of screen
    var t = el.textContent.trim();
    return t.length >= 2 && t.length <= 150 && r.height > 10;
  });

  var out=[];
  for(var i=0; i<items.length; i++){
    var el=items[i], dom=false;
    for(var j=0; j<out.length; j++){
      if(out[j].contains(el)){dom=true;break}
      if(el.contains(out[j])){out.splice(j,1);j--}
    }
    if(!dom)out.push(el);
  }
  return out;
}

function findScrollBox(){
  var main = ms(['main','[role="main"]','[class*="content"]','[class*="chat"]']) || document.body;
  var best = null, bestA = 0;
  var divs = main.querySelectorAll('div');
  for(var i=0; i<divs.length; i++){
    var el = divs[i];
    if(el.scrollHeight - el.clientHeight > 40){
      var a = el.clientWidth * el.clientHeight;
      if(a > bestA){bestA = a;best = el}
    }
  }
  return best || window;
}

async function scrollToTop(box) {
  log('Loading full history...');
  var prev = 0, stable = 0, pass = 0;
  while(pass < 40){ // Safety limit for mobile performance
    if(box === window) window.scrollTo(0, 0);
    else box.scrollTop = 0;
    
    await wait(C.scrollPause);
    var h = box === window ? document.documentElement.scrollHeight : box.scrollHeight;
    if(h === prev){
      stable++;
      if(stable >= C.stableHits){log('Reached beginning.','lime'); break;}
    } else stable = 0;
    
    if(pass % 5 === 0) log('  Pass ' + pass + ' | height:' + h);
    prev = h; pass++;
  }
  await wait(C.loadWait);
}

function extractChat(scrollBox) {
  var msgs = [];
  var seen = new Set();
  
  // Universal Scraper Strategy: Grab all text containers inside the chat view panel
  var elements = document.querySelectorAll('p, pre, code, span, div, article');
  
  elements.forEach(function(el) {
    // Skip wrapper items containing deep sub-trees
    if (el.children.length > 3) return;
    
    var txt = (el.innerText || el.textContent || '').trim();
    if (txt.length < 2 || seen.has(txt)) return;
    
    // Skip control UI strings
    if (/^(\?|🎨|🚀|stop|regenerate|clear|share|copy)$/i.test(txt)) return;
    
    seen.add(txt);
    
    // Classify Sender using visual layout cues (User texts are typically aligned right or have specific class signatures)
    var html = el.outerHTML.toLowerCase();
    var style = window.getComputedStyle(el);
    var isUser = html.includes('user') || 
                 style.textAlign === 'right' || 
                 style.alignSelf === 'flex-end' ||
                 parseInt(style.paddingLeft) > 100;
                 
    msgs.push({
      role: isUser ? 'USER' : 'AI',
      text: txt.replace(/\n{3,}/g, '\n\n')
    });
  });
  
  return msgs;
}

function download(name,data){
  var b=new Blob([data],{type:'text/plain;charset=utf-8'});
  var u=URL.createObjectURL(b);
  var a=document.createElement('a');
  a.href=u; a.download=name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){a.remove();URL.revokeObjectURL(u)},1000);
  log('Downloaded: '+name,'lime');
}

async function main(){
  log('═══ MiMo Chat Export v2.0 ═══','#58a6ff');
  log('Page: '+location.hostname);

  var items = findSidebarItems();
  log('Conversations found: ' + items.length);

  if(items.length > 1){
    log('Exporting ' + items.length + ' chats...');
    var master='', count=0;

    for(var i=0; i<items.length; i++){
      var el = items[i];
      var title = (el.textContent || '').trim().split('\n')[0].substring(0,60) || 'Chat '+(i+1);
      log('\n['+(i+1)+'/'+items.length+'] ' + title);

      el.click();
      await wait(C.switchWait);

      var box = findScrollBox();
      await scrollToTop(box);
      var msgs = extractChat(box);
      log('  -> ' + msgs.length + ' messages found');

      if(msgs.length > 0){
        master += '===== CHAT '+(i+1)+': '+title+' =====\n\n';
        for(var j=0; j<msgs.length; j++){
          master += msgs[j].role + ':\n' + msgs[j].text + '\n\n';
        }
        master += '\n';
        count++;
      }
    }

    if(count){
      download('mimo-all-chats.txt', master);
      log('\nExported '+count+' chats successfully!','lime');
    } else {
      log('\nNo messages parsed. Structural change detected.','red');
    }

  } else {
    log('Single chat mode running...');
    var box = findScrollBox();
    await scrollToTop(box);
    var msgs = extractChat(box);
    log('Messages grabbed: ' + msgs.length);

    if(msgs.length){
      var txt = '===== SINGLE CHAT EXPORT =====\n\n';
      for(var j=0; j<msgs.length; j++){
        txt += msgs[j].role + ':\n' + msgs[j].text + '\n\n';
      }
      download('mimo-chat.txt', txt);
    } else {
      log('\nNo messages found inside container view.','red');
    }
  }
}

main().catch(function(e){
  log('Error: '+e.message,'red');
});

})();
