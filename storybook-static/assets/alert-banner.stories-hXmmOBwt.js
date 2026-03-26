import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{r as n,t as r,v as i,y as a}from"./lucide-react-DnM_rwBX.js";import{n as o,t as s}from"./utils-CfjevCzH.js";import{i as c,n as l,r as u,t as d}from"./alert-CrvrV-98.js";function f({status:e,utilizationPct:t,message:n,className:r}){let i=m[e],a=i.icon;return(0,p.jsxs)(d,{className:s(i.className,r),children:[(0,p.jsx)(a,{className:`size-4`}),(0,p.jsx)(u,{children:i.title}),(0,p.jsxs)(l,{children:[n,` (`,t.toFixed(1),`% tận dụng)`]})]})}var p,m,h=e((()=>{p=t(),r(),o(),c(),m={GREEN:{icon:i,title:`Kho tấm lẻ bình thường`,className:`border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200`},YELLOW:{icon:a,title:`Kho tấm lẻ sắp đầy`,className:`border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200`},RED:{icon:n,title:`Kho tấm lẻ quá tải — Tạm ngừng xuất tấm nguyên`,className:`border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200`}},f.__docgenInfo={description:``,methods:[],displayName:`AlertBanner`,props:{status:{required:!0,tsType:{name:`union`,raw:`'GREEN' | 'YELLOW' | 'RED'`,elements:[{name:`literal`,value:`'GREEN'`},{name:`literal`,value:`'YELLOW'`},{name:`literal`,value:`'RED'`}]},description:``},utilizationPct:{required:!0,tsType:{name:`number`},description:``},message:{required:!0,tsType:{name:`string`},description:``},className:{required:!1,tsType:{name:`string`},description:``}}}})),g,_,v,y,b,x,S;e((()=>{g=t(),h(),_={title:`Dashboard/AlertBanner`,component:f,tags:[`autodocs`],parameters:{viewport:{defaultViewport:`desktop1280`}},argTypes:{status:{control:`select`,options:[`GREEN`,`YELLOW`,`RED`]},utilizationPct:{control:{type:`range`,min:0,max:100,step:.5}},message:{control:`text`}}},v={args:{status:`GREEN`,utilizationPct:42.5,message:`Kho đang hoạt động bình thường`}},y={args:{status:`YELLOW`,utilizationPct:78.3,message:`Kho sắp đầy — cân nhắc xuất tấm lẻ`}},b={args:{status:`RED`,utilizationPct:96.1,message:`Kho quá tải — tạm ngừng nhận tấm nguyên mới`}},x={name:`All statuses`,render:()=>(0,g.jsxs)(`div`,{className:`flex flex-col gap-4 max-w-2xl p-4`,children:[(0,g.jsx)(f,{status:`GREEN`,utilizationPct:42.5,message:`Kho đang hoạt động bình thường`}),(0,g.jsx)(f,{status:`YELLOW`,utilizationPct:78.3,message:`Kho sắp đầy — cân nhắc xuất tấm lẻ`}),(0,g.jsx)(f,{status:`RED`,utilizationPct:96.1,message:`Kho quá tải — tạm ngừng nhận tấm nguyên mới`})]})},v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'GREEN',
    utilizationPct: 42.5,
    message: 'Kho đang hoạt động bình thường'
  }
}`,...v.parameters?.docs?.source}}},y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'YELLOW',
    utilizationPct: 78.3,
    message: 'Kho sắp đầy — cân nhắc xuất tấm lẻ'
  }
}`,...y.parameters?.docs?.source}}},b.parameters={...b.parameters,docs:{...b.parameters?.docs,source:{originalSource:`{
  args: {
    status: 'RED',
    utilizationPct: 96.1,
    message: 'Kho quá tải — tạm ngừng nhận tấm nguyên mới'
  }
}`,...b.parameters?.docs?.source}}},x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  name: 'All statuses',
  render: () => <div className="flex flex-col gap-4 max-w-2xl p-4">
      <AlertBanner status="GREEN" utilizationPct={42.5} message="Kho đang hoạt động bình thường" />
      <AlertBanner status="YELLOW" utilizationPct={78.3} message="Kho sắp đầy — cân nhắc xuất tấm lẻ" />
      <AlertBanner status="RED" utilizationPct={96.1} message="Kho quá tải — tạm ngừng nhận tấm nguyên mới" />
    </div>
}`,...x.parameters?.docs?.source}}},S=[`Green`,`Yellow`,`Red`,`AllStatuses`]}))();export{x as AllStatuses,v as Green,b as Red,y as Yellow,S as __namedExportsOrder,_ as default};