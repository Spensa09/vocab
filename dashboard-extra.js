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
const originalRenderAll=renderAll;
renderAll=function(){originalRenderAll();renderVocabSummary();renderNotion()};
renderVocabSummary();
renderNotion();
