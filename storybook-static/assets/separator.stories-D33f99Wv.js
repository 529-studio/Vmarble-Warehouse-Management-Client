import{n as e}from"./chunk-vNrZSFDR.js";import{_ as t}from"./iframe-BgtsNA66.js";import{n,t as r}from"./separator-D9YBii3E.js";var i,a,o,s,c;e((()=>{i=t(),n(),a={title:`UI/Separator`,component:r,tags:[`autodocs`],argTypes:{orientation:{control:`select`,options:[`horizontal`,`vertical`]},decorative:{control:`boolean`}}},o={render:()=>(0,i.jsxs)(`div`,{className:`w-64 space-y-3`,children:[(0,i.jsx)(`p`,{className:`text-sm`,children:`Phần trên`}),(0,i.jsx)(r,{}),(0,i.jsx)(`p`,{className:`text-sm`,children:`Phần dưới`})]})},s={render:()=>(0,i.jsxs)(`div`,{className:`flex h-10 items-center gap-3`,children:[(0,i.jsx)(`span`,{className:`text-sm`,children:`Trái`}),(0,i.jsx)(r,{orientation:`vertical`}),(0,i.jsx)(`span`,{className:`text-sm`,children:`Phải`})]})},o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  render: () => <div className="w-64 space-y-3">
      <p className="text-sm">Phần trên</p>
      <Separator />
      <p className="text-sm">Phần dưới</p>
    </div>
}`,...o.parameters?.docs?.source}}},s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  render: () => <div className="flex h-10 items-center gap-3">
      <span className="text-sm">Trái</span>
      <Separator orientation="vertical" />
      <span className="text-sm">Phải</span>
    </div>
}`,...s.parameters?.docs?.source}}},c=[`Horizontal`,`Vertical`]}))();export{o as Horizontal,s as Vertical,c as __namedExportsOrder,a as default};