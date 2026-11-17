// One focus owner for the existing modal flows, with a predictable Escape path.
export function installMenuDialogs(){
 const doc=document;
 const dialogs=[...doc.querySelectorAll('.modal')],returnFocus=new Map(),stack=[],history=[];
 const closers={'unsaved-menu':'unsaved-cancel','mission-select':'close-mission-select','lan-panel':'lan-close',settings:'close-settings',help:'close-help','map-screen':'close-map',armory:'close-armory',pause:'resume'};
 const visible=dialog=>!dialog.classList.contains('hidden');
 const focusables=dialog=>[...dialog.querySelectorAll('button,input,select,a[href],[tabindex]')].filter(el=>!el.disabled&&el.tabIndex!==-1&&!el.closest('.hidden')&&(typeof el.getClientRects!=='function'||el.getClientRects().length>0));
 function focusin(event){history.push(event.target);if(history.length>30)history.shift()}
 doc.addEventListener('focusin',focusin);
 function sync(){let restore=null,opened=null;for(const dialog of dialogs){const index=stack.indexOf(dialog);if(visible(dialog)&&index<0){returnFocus.set(dialog,[...history].reverse().find(el=>el.isConnected&&!dialog.contains(el))||doc.activeElement);stack.push(dialog);opened=dialog}else if(!visible(dialog)&&index>=0){stack.splice(index,1);restore=returnFocus.get(dialog);returnFocus.delete(dialog)}}
  const top=stack.at(-1);for(const id of ['menu','header','game']){const node=doc.getElementById(id);if(node)node.inert=!!top}for(const dialog of dialogs)dialog.inert=!!top&&dialog!==top;
  if(opened===top)focusables(top)[0]?.focus();else if(restore?.isConnected&&!restore.disabled&&!restore.closest('.hidden'))restore.focus();
 }
 const observer=new MutationObserver(sync);dialogs.forEach(dialog=>observer.observe(dialog,{attributes:true,attributeFilter:['class']}));sync();
 function keydown(event){const top=stack.at(-1);if(!top)return;if(event.key==='Escape'&&closers[top.id]){event.preventDefault();event.stopPropagation();doc.getElementById(closers[top.id])?.click();return}if(event.key!=='Tab')return;const list=focusables(top),first=list[0],last=list.at(-1);if(!first){event.preventDefault();return}if(!top.contains(doc.activeElement)){event.preventDefault();(event.shiftKey?last:first).focus()}else if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus()}}
 doc.addEventListener('keydown',keydown,true);return ()=>{observer.disconnect();doc.removeEventListener('focusin',focusin);doc.removeEventListener('keydown',keydown,true);for(const id of ['menu','header','game']){const node=doc.getElementById(id);if(node)node.inert=false}};
}
