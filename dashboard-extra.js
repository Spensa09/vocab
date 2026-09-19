const VOCAB_START=new Date('2026-09-19T00:00:00+08:00'),VOCAB_GAPS=[1,2,4,7,15,30];
function renderVocabSummary(){
  const day=Math.floor((new Date()-VOCAB_START)/86400000);
  let newCount=0,reviewCount=0;
  if(day>=0&&day<52){
    for(let list=100;list>=1;list--){
      const learned=list>=88?0:Math.floor((87-list)/4),gap=day-learned;
      if(list<=87&&gap===0)newCount++;
      if((list>=88&&day===0)||VOCAB_GAPS.includes(gap))reviewCount++;
    }
  }
  document.querySelector('#vocabNew').textContent=newCount;
  document.querySelector('#vocabReview').textContent=reviewCount;
}
function validNotionUrl(value){
  try{
    const url=new URL(value),host=url.hostname.toLowerCase();
    return url.protocol==='https:'&&(
      host==='app.notion.com'||
      host==='notion.so'||host.endsWith('.notion.so')||
      host==='notion.site'||host.endsWith('.notion.site')
    );
  }catch{return false}
}
function renderNotion(){
  const connected=validNotionUrl(data.notionUrl||''),button=document.querySelector('#outlook');
  document.querySelector('#notionState').textContent=connected?'已连接 · 点击按钮打开页面':'尚未设置 Notion 页面';
  button.textContent=connected?'打开 Notion':'连接 Notion 页面';
}
document.querySelector('#outlook').onclick=()=>{
  if(validNotionUrl(data.notionUrl||'')){
    window.open(data.notionUrl,'_blank','noopener');
    return;
  }
  const value=prompt('粘贴你的 Notion 页面链接（支持 app.notion.com、notion.so 和 notion.site）');
  if(value===null)return;
  if(!validNotionUrl(value.trim()))return alert('请输入有效的 Notion 页面链接');
  data.notionUrl=value.trim();
  persist();
};

let todoViewDate=iso(new Date());
const todoDateInput=document.querySelector('#todoViewDate');
todoDateInput.value=todoViewDate;
function shiftISO(value,days){
  const d=new Date(value+'T12:00:00');
  d.setDate(d.getDate()+days);
  return iso(d);
}
function scheduledDate(todo){return todo.scheduledDate||todo.due||iso(new Date())}
function todoDetails(todo){
  const parts=[];
  if(todo.done)parts.push(`已完成${todo.completedOn?' · '+todo.completedOn:''}`);
  else if(todo.movedTo)parts.push(`未完成 · 已移到 ${todo.movedTo}`);
  if(todo.due)parts.push(`<span class="${todo.due<iso(new Date())&&!todo.done?'overdue':''}">截止 ${todo.due}</span>`);
  if(todo.repeatDays)parts.push(`每 ${todo.repeatDays} 天循环`);
  return parts.join(' · ');
}
function renderTodos(){
  todoDateInput.value=todoViewDate;
  const all=data.categories.flatMap(c=>(c.todos||[]).filter(t=>scheduledDate(t)===todoViewDate));
  const completed=all.filter(t=>t.done).length,moved=all.filter(t=>t.movedTo).length;
  document.querySelector('#todoSummary').textContent=`${todoViewDate} · 完成 ${completed} 项 · 未完成 ${all.length-completed} 项${moved?'（其中 '+moved+' 项已顺延）':''}`;
  const box=document.querySelector('#categories');
  box.innerHTML=data.categories.length?data.categories.map(c=>{
    const todos=(c.todos||[]).filter(t=>scheduledDate(t)===todoViewDate),done=todos.filter(t=>t.done).length;
    return `<section class="category"><div class="catTitle"><i style="background:${c.color}"></i><strong>${esc(c.name)}</strong><small>${done}/${todos.length}</small><button class="iconBtn" data-add-todo="${c.id}">＋</button><button class="iconBtn" data-del-cat="${c.id}">✕</button></div><div class="todoList">${todos.length?todos.map(t=>`<div class="todo ${t.movedTo?'movedTodo':''}"><input type="checkbox" data-check="${c.id}|${t.id}" ${t.done?'checked':''} ${t.movedTo?'disabled':''}><div class="todoText ${t.done?'done':''}">${esc(t.title)}<div class="todoMeta">${todoDetails(t)}</div></div>${!t.done&&!t.movedTo?`<button class="carryBtn" data-carry="${c.id}|${t.id}">移到明天</button>`:''}<button class="iconBtn" data-del-todo="${c.id}|${t.id}">✕</button></div>`).join(''):'<div class="empty">这一天没有任务，点击＋添加</div>'}</div></section>`;
  }).join(''):'<div class="empty">先创建“作业”“竞赛”等分类</div>';
  document.querySelectorAll('[data-add-todo]').forEach(b=>b.onclick=()=>{
    document.querySelector('#todoCategoryId').value=b.dataset.addTodo;
    document.querySelector('#todoTitle').value='';
    document.querySelector('#todoScheduledDate').value=todoViewDate;
    document.querySelector('#todoDue').value='';
    document.querySelector('#todoRepeat').value='0';
    document.querySelector('#customRepeatWrap').style.display='none';
    openModal('todoModal');
  });
  document.querySelectorAll('[data-del-cat]').forEach(b=>b.onclick=()=>{if(confirm('删除这个分类和其中的任务？')){data.categories=data.categories.filter(c=>c.id!==b.dataset.delCat);persist()}});
  document.querySelectorAll('[data-del-todo]').forEach(b=>b.onclick=()=>{const[cid,tid]=b.dataset.delTodo.split('|'),c=data.categories.find(x=>x.id===cid);c.todos=c.todos.filter(t=>t.id!==tid);persist()});
  document.querySelectorAll('[data-carry]').forEach(b=>b.onclick=()=>{
    const[cid,tid]=b.dataset.carry.split('|'),c=data.categories.find(x=>x.id===cid),t=c.todos.find(x=>x.id===tid),next=shiftISO(scheduledDate(t),1);
    t.movedTo=next;
    c.todos.push({...t,id:uid(),scheduledDate:next,done:false,completedOn:'',movedTo:'',carriedFrom:t.id});
    persist();
  });
  document.querySelectorAll('[data-check]').forEach(b=>b.onchange=()=>{
    const[cid,tid]=b.dataset.check.split('|'),c=data.categories.find(x=>x.id===cid),t=c.todos.find(x=>x.id===tid);
    t.done=b.checked;t.completedOn=b.checked?todoViewDate:'';
    if(t.repeatDays){
      if(b.checked&&!c.todos.some(x=>x.repeatSource===t.id)){
        const next=shiftISO(scheduledDate(t),t.repeatDays);
        c.todos.push({...t,id:uid(),scheduledDate:next,due:t.due?shiftISO(t.due,t.repeatDays):'',done:false,completedOn:'',movedTo:'',repeatSource:t.id});
      }else if(!b.checked)c.todos=c.todos.filter(x=>x.repeatSource!==t.id);
    }
    persist();
  });
}
document.querySelector('#todoPrevDay').onclick=()=>{todoViewDate=shiftISO(todoViewDate,-1);renderTodos()};
document.querySelector('#todoNextDay').onclick=()=>{todoViewDate=shiftISO(todoViewDate,1);renderTodos()};
document.querySelector('#todoToday').onclick=()=>{todoViewDate=iso(new Date());renderTodos()};
todoDateInput.onchange=()=>{if(todoDateInput.value){todoViewDate=todoDateInput.value;renderTodos()}};
document.querySelector('#saveTodo').onclick=()=>{
  const title=document.querySelector('#todoTitle').value.trim(),c=data.categories.find(x=>x.id===document.querySelector('#todoCategoryId').value);
  if(!title||!c)return alert('请填写任务内容');
  const v=document.querySelector('#todoRepeat').value,repeatDays=v==='custom'?Math.max(1,+document.querySelector('#customRepeat').value||1):+v;
  c.todos.push({id:uid(),title,scheduledDate:document.querySelector('#todoScheduledDate').value||todoViewDate,due:document.querySelector('#todoDue').value,repeatDays,done:false,completedOn:'',movedTo:''});
  closeModal('todoModal');persist();
};
const originalRenderAll=renderAll;
renderAll=function(){originalRenderAll();renderVocabSummary();renderNotion()};
renderVocabSummary();
renderNotion();
renderTodos();
